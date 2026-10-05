import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { FetchImplementation } from "../lib/crawler/http-fetcher.ts";
import { SrotivaApiError } from "../lib/api/errors.ts";
import { clearRobotsCache } from "../lib/crawler/robots-policy.ts";
import type { DnsResolver } from "../lib/crawler/url-safety.ts";
import { discoverNativeFeeds } from "../lib/feed/discover-native-feeds.ts";

const publicLookup: DnsResolver = async () => ["93.184.216.34"];
const rss = await readFile(new URL("./fixtures/html-with-rss-link.html", import.meta.url), "utf8");
const atom = await readFile(new URL("./fixtures/html-with-atom-link.html", import.meta.url), "utf8");
const rssFeed = `<?xml version="1.0"?><rss version="2.0"><channel><title>Common RSS</title><link>https://example.com</link></channel></rss>`;

function options(fetchImpl: FetchImplementation) {
  return {
    lookup: publicLookup,
    timeoutMs: 1_000,
    maxBytes: 10_000,
    maxRedirects: 2,
    userAgent: "SrotivaBot/1.0",
    fetchImpl,
  };
}

function mockPage(bodyText: string): FetchImplementation {
  return async (input) => {
    const url = new URL(input);
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /");
    return new Response(bodyText, { headers: { "content-type": "text/html" } });
  };
}

test.beforeEach(() => clearRobotsCache());

test("finds and resolves an RSS alternate link", async () => {
  const candidates = await discoverNativeFeeds({
    sourceUrl: "https://example.com/articles",
    fetchOptions: options(mockPage(rss)),
  });
  assert.deepEqual(candidates, [{
    url: "https://example.com/feed.xml",
    type: "rss",
    title: "Example RSS",
    source: "alternate_link",
    confidence: 0.95,
  }]);
});

test("finds an Atom alternate link", async () => {
  const candidates = await discoverNativeFeeds({
    sourceUrl: "https://example.com/",
    fetchOptions: options(mockPage(atom)),
  });
  assert.equal(candidates[0]?.type, "atom");
  assert.equal(candidates[0]?.url, "https://example.com/atom.xml");
});

test("resolves relative links against the final page URL", async () => {
  const fetchImpl: FetchImplementation = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/robots.txt") return new Response("");
    if (url.pathname === "/start") {
      return new Response(null, { status: 302, headers: { location: "/blog/index.html" } });
    }
    return new Response('<link rel="alternate" type="application/rss+xml" href="feed.xml">');
  };
  const candidates = await discoverNativeFeeds({
    sourceUrl: "https://example.com/start",
    fetchOptions: options(fetchImpl),
  });
  assert.equal(candidates[0]?.url, "https://example.com/blog/feed.xml");
});

test("deduplicates identical alternate URLs", async () => {
  const html = `<link rel="alternate" type="application/rss+xml" href="/feed.xml">
    <link rel="alternate" type="application/rss+xml" href="https://example.com/feed.xml#top">`;
  const candidates = await discoverNativeFeeds({
    sourceUrl: "https://example.com/",
    fetchOptions: options(mockPage(html)),
  });
  assert.equal(candidates.length, 1);
});

test("probes only same-origin common paths when the page has no alternate link", async () => {
  const requested: string[] = [];
  const fetchImpl: FetchImplementation = async (input) => {
    const url = new URL(input);
    requested.push(url.href);
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /");
    if (url.pathname === "/blog") return new Response("<html></html>");
    if (url.pathname === "/rss.xml") {
      return new Response(rssFeed, { headers: { "content-type": "application/rss+xml" } });
    }
    return new Response("missing", { status: 404 });
  };

  const candidates = await discoverNativeFeeds({
    sourceUrl: "https://example.com/blog",
    fetchOptions: options(fetchImpl),
  });

  assert.deepEqual(candidates, [{
    url: "https://example.com/rss.xml",
    type: "rss",
    title: "Common RSS",
    source: "common_path",
    confidence: 0.75,
  }]);
  assert.ok(requested.every((url) => new URL(url).origin === "https://example.com"));
  assert.ok(!requested.some((url) => new URL(url).hostname === "other.example"));
});

test("checks robots before following a page redirect", async () => {
  const requested: string[] = [];
  const fetchImpl: FetchImplementation = async (input) => {
    const url = new URL(input);
    requested.push(url.href);
    if (url.hostname === "example.com" && url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /");
    }
    if (url.hostname === "other.example" && url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /private");
    }
    if (url.pathname === "/start") {
      return new Response(null, {
        status: 302,
        headers: { location: "https://other.example/private" },
      });
    }
    return new Response("<html></html>");
  };

  await assert.rejects(
    discoverNativeFeeds({
      sourceUrl: "https://example.com/start",
      fetchOptions: options(fetchImpl),
    }),
    (error: unknown) => error instanceof SrotivaApiError && error.code === "ROBOTS_DISALLOWED",
  );
  assert.ok(!requested.includes("https://other.example/private"));
});

test("does not follow cross-origin redirects from common feed paths", async () => {
  const requested: string[] = [];
  const fetchImpl: FetchImplementation = async (input) => {
    const url = new URL(input);
    requested.push(url.href);
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /");
    if (url.pathname === "/blog") return new Response("<html></html>");
    if (url.pathname === "/feed") {
      return new Response(null, {
        status: 302,
        headers: { location: "https://other.example/feed" },
      });
    }
    return new Response("missing", { status: 404 });
  };

  const candidates = await discoverNativeFeeds({
    sourceUrl: "https://example.com/blog",
    fetchOptions: options(fetchImpl),
  });
  assert.deepEqual(candidates, []);
  assert.ok(!requested.includes("https://other.example/feed"));
});

test("uses the parsed document root to classify common feeds", async () => {
  const fetchImpl: FetchImplementation = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /");
    if (url.pathname === "/blog") return new Response("<html></html>");
    if (url.pathname === "/feed") {
      return new Response(`<!-- <feed> is not the root --><rss version="2.0"><channel><title>RSS</title></channel></rss>`);
    }
    return new Response("missing", { status: 404 });
  };

  const candidates = await discoverNativeFeeds({
    sourceUrl: "https://example.com/blog",
    fetchOptions: options(fetchImpl),
  });
  assert.equal(candidates[0]?.type, "rss");
});
