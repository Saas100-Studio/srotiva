import assert from "node:assert/strict";
import test from "node:test";

import { MorselApiError } from "../lib/api/errors.ts";
import type { FetchImplementation } from "../lib/crawler/http-fetcher.ts";
import {
  checkRobotsAllowed,
  clearRobotsCache,
} from "../lib/crawler/robots-policy.ts";
import type { DnsResolver } from "../lib/crawler/url-safety.ts";

const publicLookup: DnsResolver = async () => ["93.184.216.34"];
const userAgent = "MorselBot/1.0 (+https://morsel.example/bot)";

function options(fetchImpl: FetchImplementation, hostname: string) {
  return {
    targetUrl: `https://${hostname}/articles/latest`,
    userAgent,
    fetchOptions: {
      fetchImpl,
      lookup: publicLookup,
      timeoutMs: 1_000,
      maxBytes: 10_000,
    },
  };
}

test.beforeEach(() => clearRobotsCache());

test("allows a path when robots has no matching disallow", async () => {
  const fetchImpl: FetchImplementation = async () =>
    new Response("User-agent: *\nDisallow: /private\n");

  assert.equal(
    await checkRobotsAllowed(options(fetchImpl, "allowed.example")),
    true,
  );
});

test("blocks a path disallowed for the configured crawler", async () => {
  const fetchImpl: FetchImplementation = async () =>
    new Response(
      "User-agent: MorselBot\nDisallow: /articles\n\n" +
        "User-agent: *\nAllow: /\n",
    );

  await assert.rejects(
    checkRobotsAllowed(options(fetchImpl, "blocked.example")),
    (error: unknown) => {
      assert.ok(error instanceof MorselApiError);
      assert.equal(error.code, "ROBOTS_DISALLOWED");
      assert.equal(error.status, 403);
      return true;
    },
  );
});

test("does not apply a prefix-matching crawler group", async () => {
  const fetchImpl: FetchImplementation = async () =>
    new Response(
      "User-agent: Morsel\nAllow: /articles\n\n" +
        "User-agent: *\nDisallow: /articles\n",
    );

  await assert.rejects(
    checkRobotsAllowed(options(fetchImpl, "exact-agent.example")),
    (error: unknown) => {
      assert.ok(error instanceof MorselApiError);
      assert.equal(error.code, "ROBOTS_DISALLOWED");
      return true;
    },
  );
});

test("allows a fetch when robots.txt returns 404", async () => {
  const fetchImpl: FetchImplementation = async () =>
    new Response("not found", { status: 404 });

  assert.equal(
    await checkRobotsAllowed(options(fetchImpl, "missing.example")),
    true,
  );
});

test("uses the longest matching rule and lets allow win an equal tie", async () => {
  const fetchImpl: FetchImplementation = async () =>
    new Response(
      "User-agent: *\n" +
        "Disallow: /articles\n" +
        "Allow: /articles/latest\n" +
        "Disallow: /articles/latest\n",
    );

  assert.equal(
    await checkRobotsAllowed(options(fetchImpl, "precedence.example")),
    true,
  );
});

test("caches robots responses by origin for ten minutes", async () => {
  let requests = 0;
  const fetchImpl: FetchImplementation = async () => {
    requests += 1;
    return new Response("User-agent: *\nAllow: /\n");
  };
  const base = options(fetchImpl, "cache.example");

  await checkRobotsAllowed({ ...base, now: () => 1_000 });
  await checkRobotsAllowed({
    ...base,
    targetUrl: "https://cache.example/another",
    now: () => 1_000 + 599_999,
  });
  assert.equal(requests, 1);

  await checkRobotsAllowed({
    ...base,
    now: () => 1_000 + 600_000,
  });
  assert.equal(requests, 2);
});
