import assert from "node:assert/strict";
import test from "node:test";

import { MorselApiError } from "../lib/api/errors.ts";
import { isUnsafeIpAddress } from "../lib/crawler/ip-ranges.ts";
import {
  assertSafeRedirectUrl,
  assertSafeUrlForFetch,
  normalizeUserUrl,
  type DnsResolver,
} from "../lib/crawler/url-safety.ts";

const publicLookup: DnsResolver = async () => [
  { address: "93.184.216.34", family: 4 },
  { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
];

test("classifies public and non-public IP ranges", () => {
  for (const address of [
    "0.0.0.1",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.0.1",
    "198.18.0.1",
    "203.0.113.1",
    "224.0.0.1",
    "240.0.0.1",
    "::",
    "::1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "3fff::1",
  ]) {
    assert.equal(isUnsafeIpAddress(address), true, address);
  }

  assert.equal(isUnsafeIpAddress("8.8.8.8"), false);
  assert.equal(isUnsafeIpAddress("2606:4700:4700::1111"), false);
});

async function rejectsWithCode(
  promise: Promise<unknown> | (() => unknown),
  code: string,
): Promise<void> {
  const operation = typeof promise === "function"
    ? Promise.resolve().then(promise)
    : promise;
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof MorselApiError);
    assert.equal(error.code, code);
    return true;
  });
}

test("accepts a public HTTPS URL", async () => {
  const result = await assertSafeUrlForFetch("https://example.com/blog", {
    lookup: publicLookup,
  });

  assert.equal(result.url.href, "https://example.com/blog");
  assert.equal(result.hostname, "example.com");
  assert.deepEqual(result.resolvedAddresses, [
    "93.184.216.34",
    "2606:2800:220:1:248:1893:25c8:1946",
  ]);
});

test("normalizes an uppercase hostname and removes the fragment", () => {
  assert.equal(
    normalizeUserUrl(" HTTPS://EXAMPLE.COM:443/blog#section ").href,
    "https://example.com/blog",
  );
});

test("INVALID_URL rejects a non-URL value", async () => {
  await rejectsWithCode(() => normalizeUserUrl("not-a-url"), "INVALID_URL");
});

test("UNSUPPORTED_PROTOCOL rejects file URLs", async () => {
  await rejectsWithCode(
    () => normalizeUserUrl("file:///etc/passwd"),
    "UNSUPPORTED_PROTOCOL",
  );
});

test("UNSAFE_PORT rejects localhost:3000 before DNS resolution", async () => {
  let lookupCalled = false;
  await rejectsWithCode(
    assertSafeUrlForFetch("http://localhost:3000", {
      lookup: async () => {
        lookupCalled = true;
        return ["93.184.216.34"];
      },
    }),
    "UNSAFE_PORT",
  );
  assert.equal(lookupCalled, false);
});

test("UNSAFE_URL rejects localhost on a standard port", async () => {
  await rejectsWithCode(
    assertSafeUrlForFetch("http://localhost"),
    "UNSAFE_URL",
  );
});

test("UNSAFE_URL rejects IPv4 loopback addresses", async () => {
  for (const value of [
    "http://127.0.0.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://127.1",
  ]) {
    await rejectsWithCode(assertSafeUrlForFetch(value), "UNSAFE_URL");
  }
});

test("UNSAFE_URL rejects trailing-dot localhost", async () => {
  await rejectsWithCode(
    assertSafeUrlForFetch("http://localhost."),
    "UNSAFE_URL",
  );
});

test("UNSAFE_URL rejects the cloud metadata address", async () => {
  await rejectsWithCode(
    assertSafeUrlForFetch("http://169.254.169.254/latest/meta-data"),
    "UNSAFE_URL",
  );
});

test("UNSAFE_URL rejects URLs containing credentials", async () => {
  await rejectsWithCode(
    () => normalizeUserUrl("https://user:pass@example.com"),
    "UNSAFE_URL",
  );
});

test("UNSAFE_URL rejects redirects from a public host to a private IP", async () => {
  await rejectsWithCode(
    assertSafeRedirectUrl("http://192.168.1.10/feed", "example.com"),
    "UNSAFE_URL",
  );
});

test("UNSAFE_URL rejects any private address in a DNS response", async () => {
  await rejectsWithCode(
    assertSafeUrlForFetch("https://example.com/feed", {
      lookup: async () => ["93.184.216.34", "10.0.0.5"],
    }),
    "UNSAFE_URL",
  );
});

test("UNSAFE_URL rejects private and link-local IPv6 addresses", async () => {
  for (const value of [
    "http://[::1]/",
    "http://[fc00::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:127.0.0.1]/",
  ]) {
    await rejectsWithCode(assertSafeUrlForFetch(value), "UNSAFE_URL");
  }
});

test("UNSAFE_PORT rejects port 22 and accepts port 443", async () => {
  await rejectsWithCode(
    assertSafeUrlForFetch("https://example.com:22/feed", {
      lookup: publicLookup,
    }),
    "UNSAFE_PORT",
  );
  const result = await assertSafeUrlForFetch("https://example.com:443/feed", {
    lookup: publicLookup,
  });
  assert.equal(result.url.href, "https://example.com/feed");
});

test("UNSAFE_URL rejects DNS resolution failures", async () => {
  await rejectsWithCode(
    assertSafeUrlForFetch("https://missing.example/feed", {
      lookup: async () => {
        throw new Error("ENOTFOUND");
      },
    }),
    "UNSAFE_URL",
  );
});
