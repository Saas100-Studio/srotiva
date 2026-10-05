import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { performance } from "node:perf_hooks";
import { Readable } from "node:stream";

import { SrotivaApiError } from "../api/errors.ts";
import {
  DEFAULT_FETCH_MAX_REDIRECTS,
  loadFetchLimits,
} from "../config/limits.ts";
import {
  assertSafeRedirectUrl,
  assertSafeUrlForFetch,
  type DnsResolver,
} from "./url-safety.ts";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const FETCH_ERROR_CODE = {
  TIMEOUT: "FETCH_TIMEOUT",
  TOO_LARGE: "FETCH_TOO_LARGE",
  REDIRECT_LIMIT: "FETCH_REDIRECT_LIMIT",
  HTTP_ERROR: "FETCH_HTTP_ERROR",
} as const;

export type FetchImplementation = (
  input: string | URL,
  init?: RequestInit,
  resolvedAddresses?: readonly string[],
) => Promise<Response>;

export type FetchDocumentOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  userAgent?: string;
  fetchImpl?: FetchImplementation;
  lookup?: DnsResolver;
  beforeRedirect?: (url: URL) => Promise<void>;
};

export type FetchDocumentResult = {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  contentType: string | null;
  bodyText: string;
  bytes: number;
  durationMs: number;
};

function fetchError(
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): SrotivaApiError {
  return new SrotivaApiError(status, code, message, details);
}

export function getCrawlerUserAgent(): string {
  const userAgent = process.env.CRAWLER_USER_AGENT?.trim();
  if (!userAgent) throw new Error("CRAWLER_USER_AGENT is required.");
  return userAgent;
}

function validatePositiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
  return value;
}

function validateRedirectLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("maxRedirects must be a non-negative integer.");
  }
  return value;
}

function responseHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

function pinnedLookup(resolvedAddresses: readonly string[]): LookupFunction {
  const addresses = resolvedAddresses.map((address) => ({
    address,
    family: isIP(address),
  }));

  return (_hostname, options, callback) => {
    const family = options.family === 4 || options.family === 6
      ? options.family
      : undefined;
    const eligible = family
      ? addresses.filter((address) => address.family === family)
      : addresses;

    if (eligible.length === 0) {
      const error = Object.assign(
        new Error("No validated address matches the requested IP family."),
        { code: "ENOTFOUND" },
      );
      callback(error, "", 0);
      return;
    }

    if (options.all) {
      callback(null, eligible);
      return;
    }
    callback(null, eligible[0]!.address, eligible[0]!.family);
  };
}

function incomingHeaders(rawHeaders: readonly string[]): Headers {
  const headers = new Headers();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    headers.append(rawHeaders[index]!, rawHeaders[index + 1]!);
  }
  return headers;
}

const requestPinnedDocument: FetchImplementation = (
  input,
  init,
  resolvedAddresses = [],
) =>
  new Promise((resolve, reject) => {
    const url = input instanceof URL ? input : new URL(input);
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: init?.method,
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        signal: init?.signal ?? undefined,
        lookup: pinnedLookup(resolvedAddresses),
      },
      (incoming) => {
        try {
          const status = incoming.statusCode ?? 502;
          const hasBody = status !== 204 && status !== 304;
          const body = hasBody
            ? Readable.toWeb(incoming) as ReadableStream<Uint8Array>
            : null;
          resolve(
            new Response(body, {
              status,
              statusText: incoming.statusMessage,
              headers: incomingHeaders(incoming.rawHeaders),
            }),
          );
        } catch (error) {
          incoming.destroy();
          reject(error);
        }
      },
    );
    request.on("error", reject);
    request.end();
  });

async function cancelResponseBody(response: Response): Promise<void> {
  if (response.body && !response.body.locked) {
    await response.body.cancel();
  }
}

async function readLimitedBody(
  response: Response,
  maxBytes: number,
): Promise<{ bodyText: string; bytes: number }> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      await cancelResponseBody(response);
      throw fetchError(
        413,
        FETCH_ERROR_CODE.TOO_LARGE,
        "The response is larger than the configured fetch limit.",
        { maxBytes, declaredBytes },
      );
    }
  }

  if (!response.body) {
    return { bodyText: "", bytes: 0 };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bodyText = "";
  let bytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw fetchError(
          413,
          FETCH_ERROR_CODE.TOO_LARGE,
          "The response is larger than the configured fetch limit.",
          { maxBytes },
        );
      }
      bodyText += decoder.decode(value, { stream: true });
    }
    bodyText += decoder.decode();
    return { bodyText, bytes };
  } finally {
    reader.releaseLock();
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export async function fetchDocument(
  value: string | URL,
  options: FetchDocumentOptions = {},
): Promise<FetchDocumentResult> {
  const limits =
    options.timeoutMs === undefined || options.maxBytes === undefined
      ? loadFetchLimits()
      : undefined;
  const timeoutMs = validatePositiveInteger(
    options.timeoutMs ?? limits!.FETCH_TIMEOUT_MS,
    "timeoutMs",
  );
  const maxBytes = validatePositiveInteger(
    options.maxBytes ?? limits!.FETCH_MAX_BYTES,
    "maxBytes",
  );
  const maxRedirects = validateRedirectLimit(
    options.maxRedirects ?? DEFAULT_FETCH_MAX_REDIRECTS,
  );
  const userAgent = options.userAgent ?? getCrawlerUserAgent();
  const request = options.fetchImpl ?? requestPinnedDocument;
  const startedAt = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const initial = await assertSafeUrlForFetch(value.toString(), {
      lookup: options.lookup,
    });
    const originalHostname = initial.hostname;
    let currentUrl = initial.url;
    let resolvedAddresses = initial.resolvedAddresses;
    let redirects = 0;

    while (true) {
      const response = await request(
        currentUrl,
        {
          method: "GET",
          headers: {
            accept: "*/*",
            "user-agent": userAgent,
          },
          redirect: "manual",
          signal: controller.signal,
        },
        resolvedAddresses,
      );

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get("location");
        await cancelResponseBody(response);
        if (!location) {
          throw fetchError(
            502,
            FETCH_ERROR_CODE.HTTP_ERROR,
            "The upstream server returned a redirect without a location.",
            { status: response.status, url: currentUrl.href },
          );
        }
        if (redirects >= maxRedirects) {
          throw fetchError(
            508,
            FETCH_ERROR_CODE.REDIRECT_LIMIT,
            "The response exceeded the configured redirect limit.",
            { maxRedirects, url: currentUrl.href },
          );
        }

        const redirectUrl = new URL(location, currentUrl);
        const safeRedirect = await assertSafeRedirectUrl(
          redirectUrl.href,
          originalHostname,
          { lookup: options.lookup },
        );
        await options.beforeRedirect?.(safeRedirect.url);
        currentUrl = safeRedirect.url;
        resolvedAddresses = safeRedirect.resolvedAddresses;
        redirects += 1;
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        await cancelResponseBody(response);
        throw fetchError(
          502,
          FETCH_ERROR_CODE.HTTP_ERROR,
          `The upstream server returned HTTP ${response.status}.`,
          { status: response.status, url: currentUrl.href },
        );
      }

      const { bodyText, bytes } = await readLimitedBody(response, maxBytes);
      return {
        finalUrl: currentUrl.href,
        status: response.status,
        headers: responseHeaders(response.headers),
        contentType: response.headers.get("content-type"),
        bodyText,
        bytes,
        durationMs: performance.now() - startedAt,
      };
    }
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) {
      throw fetchError(
        504,
        FETCH_ERROR_CODE.TIMEOUT,
        "The upstream request timed out.",
        { timeoutMs },
      );
    }
    if (error instanceof SrotivaApiError) throw error;
    throw fetchError(
      502,
      FETCH_ERROR_CODE.HTTP_ERROR,
      "The upstream request failed.",
    );
  } finally {
    clearTimeout(timer);
  }
}
