import assert from "node:assert/strict";
import test from "node:test";

import { SrotivaApiError } from "../lib/api/errors.ts";
import {
  fetchDocument,
  type FetchImplementation,
} from "../lib/crawler/http-fetcher.ts";
import type { DnsResolver } from "../lib/crawler/url-safety.ts";

const publicLookup: DnsResolver = async () => ["93.184.216.34"];
const baseOptions = {
  lookup: publicLookup,
  timeoutMs: 1_000,
  maxBytes: 1_000,
  maxRedirects: 2,
  userAgent: "SrotivaBot/1.0 (+https://srotiva.example/bot)",
};

async function rejectsWithCode(
  operation: Promise<unknown>,
  code: string,
): Promise<SrotivaApiError> {
  let captured: SrotivaApiError | undefined;
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof SrotivaApiError);
    assert.equal(error.code, code);
    captured = error;
    return true;
  });
  return captured!;
}

test("returns structured data and sends the configured crawler user-agent", async () => {
  let requestHeaders: Headers | undefined;
  let pinnedAddresses: readonly string[] | undefined;
  const fetchImpl: FetchImplementation = async (_url, init, addresses) => {
    requestHeaders = new Headers(init?.headers);
    pinnedAddresses = addresses;
    return new Response("hello 🌍", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", "x-feed": "yes" },
    });
  };

  const result = await fetchDocument("https://example.com/feed", {
    ...baseOptions,
    fetchImpl,
  });

  assert.equal(requestHeaders?.get("user-agent"), baseOptions.userAgent);
  assert.deepEqual(pinnedAddresses, ["93.184.216.34"]);
  assert.equal(result.finalUrl, "https://example.com/feed");
  assert.equal(result.status, 200);
  assert.equal(result.contentType, "text/plain; charset=utf-8");
  assert.equal(result.headers["x-feed"], "yes");
  assert.equal(result.bodyText, "hello 🌍");
  assert.equal(result.bytes, new TextEncoder().encode("hello 🌍").byteLength);
  assert.ok(result.durationMs >= 0);
});

test("stops after the configured redirect count", async () => {
  let requests = 0;
  let cancellations = 0;
  const fetchImpl: FetchImplementation = async (url) => {
    requests += 1;
    return new Response(
      new ReadableStream({
        cancel() {
          cancellations += 1;
        },
      }),
      {
        status: 302,
        headers: { location: new URL(`/hop-${requests}`, url).href },
      },
    );
  };

  await rejectsWithCode(
    fetchDocument("https://example.com/start", {
      ...baseOptions,
      maxRedirects: 2,
      fetchImpl,
    }),
    "FETCH_REDIRECT_LIMIT",
  );
  assert.equal(requests, 3);
  assert.equal(cancellations, 3);
});

test("blocks a redirect to a private IP before requesting it", async () => {
  const requested: string[] = [];
  const fetchImpl: FetchImplementation = async (url) => {
    requested.push(url.toString());
    return new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/private" },
    });
  };

  await rejectsWithCode(
    fetchDocument("https://example.com/start", {
      ...baseOptions,
      fetchImpl,
    }),
    "UNSAFE_URL",
  );
  assert.deepEqual(requested, ["https://example.com/start"]);
});

test("aborts streamed responses above the maximum byte size", async () => {
  const fetchImpl: FetchImplementation = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("1234"));
          controller.enqueue(new TextEncoder().encode("5678"));
          controller.close();
        },
      }),
    );

  await rejectsWithCode(
    fetchDocument("https://example.com/large", {
      ...baseOptions,
      maxBytes: 5,
      fetchImpl,
    }),
    "FETCH_TOO_LARGE",
  );
});

test("cancels a body rejected by its declared content length", async () => {
  let cancelled = false;
  const fetchImpl: FetchImplementation = async () =>
    new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "content-length": "100" } },
    );

  await rejectsWithCode(
    fetchDocument("https://example.com/declared-large", {
      ...baseOptions,
      maxBytes: 5,
      fetchImpl,
    }),
    "FETCH_TOO_LARGE",
  );
  assert.equal(cancelled, true);
});

test("times out a slow response", async () => {
  const fetchImpl: FetchImplementation = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });

  await rejectsWithCode(
    fetchDocument("https://example.com/slow", {
      ...baseOptions,
      timeoutMs: 10,
      fetchImpl,
    }),
    "FETCH_TIMEOUT",
  );
});

test("returns a stable error for non-success HTTP responses", async () => {
  const error = await rejectsWithCode(
    fetchDocument("https://example.com/missing", {
      ...baseOptions,
      fetchImpl: async () => new Response("missing", { status: 404 }),
    }),
    "FETCH_HTTP_ERROR",
  );
  assert.equal(error.details.status, 404);
});
