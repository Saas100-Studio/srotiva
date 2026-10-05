import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

import {
  SrotivaApiError,
  URL_SAFETY_ERROR_CODE,
  type UrlSafetyErrorCode,
} from "../api/errors.ts";
import { isUnsafeIpAddress } from "./ip-ranges.ts";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "instance-data",
  "metadata.google.internal",
  "metadata.goog",
]);

export type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

export type DnsResolver = (
  hostname: string,
) => Promise<readonly (ResolvedAddress | string)[]>;

export type UrlSafetyOptions = {
  lookup?: DnsResolver;
};

export type SafeUrl = {
  url: URL;
  hostname: string;
  resolvedAddresses: string[];
};

function urlError(
  code: UrlSafetyErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): SrotivaApiError {
  return new SrotivaApiError(422, code, message, {
    field: "url",
    ...details,
  });
}

function normalizedHostname(url: URL): string {
  const hostname = url.hostname.startsWith("[")
    ? url.hostname.slice(1, -1)
    : url.hostname;
  return hostname.toLowerCase().replace(/\.+$/, "");
}

function isBlockedHostname(hostname: string): boolean {
  return (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost")
  );
}

async function defaultLookup(hostname: string): Promise<ResolvedAddress[]> {
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  return addresses.map(({ address, family }) => ({
    address,
    family: family === 6 ? 6 : 4,
  }));
}

function addressValue(value: ResolvedAddress | string): string {
  return typeof value === "string" ? value : value.address;
}

export function normalizeUserUrl(value: unknown): URL {
  if (typeof value !== "string" || !value.trim()) {
    throw urlError(
      URL_SAFETY_ERROR_CODE.INVALID_URL,
      "Enter a valid, absolute URL.",
    );
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw urlError(
      URL_SAFETY_ERROR_CODE.INVALID_URL,
      "Enter a valid, absolute URL.",
    );
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw urlError(
      URL_SAFETY_ERROR_CODE.UNSUPPORTED_PROTOCOL,
      "Only HTTP and HTTPS URLs are supported.",
      { protocol: url.protocol },
    );
  }
  if (url.username || url.password) {
    throw urlError(
      URL_SAFETY_ERROR_CODE.UNSAFE_URL,
      "URLs containing credentials are not allowed.",
    );
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw urlError(
      URL_SAFETY_ERROR_CODE.UNSAFE_PORT,
      "Only ports 80 and 443 are allowed.",
      { port: url.port },
    );
  }

  const hostname = normalizedHostname(url);
  if (!hostname) {
    throw urlError(
      URL_SAFETY_ERROR_CODE.INVALID_URL,
      "The URL must include a hostname.",
    );
  }
  if (!url.hostname.startsWith("[") && hostname !== url.hostname) {
    url.hostname = hostname;
  }
  url.hash = "";
  return url;
}

export async function assertSafeUrlForFetch(
  value: unknown,
  options: UrlSafetyOptions = {},
): Promise<SafeUrl> {
  const url = normalizeUserUrl(value);
  const hostname = normalizedHostname(url);

  if (isBlockedHostname(hostname)) {
    throw urlError(
      URL_SAFETY_ERROR_CODE.UNSAFE_URL,
      "The URL hostname is not publicly routable.",
      { hostname },
    );
  }

  let resolvedAddresses: string[];
  if (isIP(hostname)) {
    resolvedAddresses = [hostname];
  } else {
    try {
      const results = await (options.lookup ?? defaultLookup)(hostname);
      resolvedAddresses = [...new Set(results.map(addressValue))];
    } catch {
      throw urlError(
        URL_SAFETY_ERROR_CODE.UNSAFE_URL,
        "The URL hostname could not be safely resolved.",
        { hostname },
      );
    }
  }

  if (
    resolvedAddresses.length === 0 ||
    resolvedAddresses.some((address) => isUnsafeIpAddress(address))
  ) {
    throw urlError(
      URL_SAFETY_ERROR_CODE.UNSAFE_URL,
      "The URL resolves to a non-public network address.",
      { hostname },
    );
  }

  return { url, hostname, resolvedAddresses };
}

export function assertSafeRedirectUrl(
  value: unknown,
  originalHostname: string,
  options: UrlSafetyOptions = {},
): Promise<SafeUrl> {
  return assertSafeUrlForFetch(value, options).catch((error: unknown) => {
    if (error instanceof SrotivaApiError) {
      throw new SrotivaApiError(error.status, error.code, error.message, {
        ...error.details,
        originalHostname,
      });
    }
    throw error;
  });
}
