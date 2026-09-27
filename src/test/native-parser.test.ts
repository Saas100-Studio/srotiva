import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { MorselApiError } from "../lib/api/errors.ts";
import { parseNativeFeed } from "../lib/feed/native-parser.ts";

function fixture(name: string): Promise<string> {
  return readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

test("parses RSS metadata, items, dates, and media images", async () => {
  const parsed = parseNativeFeed({
    url: "https://example.com/feed.xml",
    bodyText: await fixture("rss-basic.xml"),
    contentType: "application/rss+xml",
  });

  assert.equal(parsed.feedTitle, "Morsel RSS");
  assert.equal(parsed.siteUrl, "https://example.com/");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0]?.title, "First RSS item");
  assert.equal(parsed.items[0]?.url, "https://example.com/posts/1");
  assert.equal(parsed.items[0]?.datePublished?.toISOString(), "2025-09-01T10:00:00.000Z");
  assert.equal(parsed.items[0]?.imageUrl, "https://example.com/images/1.jpg");
  assert.equal(parsed.items[0]?.descriptionText, "RSS description");
});

test("parses Atom metadata, links, dates, authors, and enclosure images", async () => {
  const parsed = parseNativeFeed({
    url: "https://example.org/feed.atom",
    bodyText: await fixture("atom-basic.xml"),
    contentType: "application/atom+xml",
  });

  assert.equal(parsed.feedTitle, "Morsel Atom");
  assert.equal(parsed.items[0]?.title, "First Atom entry");
  assert.equal(parsed.items[0]?.url, "https://example.org/posts/2");
  assert.equal(parsed.items[0]?.datePublished?.toISOString(), "2025-09-02T11:00:00.000Z");
  assert.equal(parsed.items[0]?.dateModified?.toISOString(), "2025-09-02T12:00:00.000Z");
  assert.equal(parsed.items[0]?.author, "Atom Writer");
  assert.equal(parsed.items[0]?.imageUrl, "https://example.org/images/2.png");
});

test("uses title and date fingerprint fallback for RSS items without link or GUID", async () => {
  const input = {
    url: "https://fallback.example/feed.xml",
    bodyText: await fixture("rss-missing-guid.xml"),
  };
  const first = parseNativeFeed(input).items[0];
  const second = parseNativeFeed(input).items[0];

  assert.equal(first?.sourceItemId, null);
  assert.equal(first?.canonicalUrl, null);
  assert.equal(first?.fingerprint, second?.fingerprint);
});

test("rejects non-feed XML with INVALID_FEED", () => {
  assert.throws(
    () =>
      parseNativeFeed({
        url: "https://example.com/document.xml",
        bodyText: "<document><title>Not a feed</title></document>",
        contentType: "application/xml",
      }),
    (error: unknown) => {
      assert.ok(error instanceof MorselApiError);
      assert.equal(error.code, "INVALID_FEED");
      assert.equal(error.status, 422);
      return true;
    },
  );
});

test("decodes standard XML entities without expanding custom entities", () => {
  const parsed = parseNativeFeed({
    url: "https://example.com/feed.xml",
    bodyText: `<rss version="2.0"><channel><title>A &amp; B</title><item><title>&#x49;tem</title><description>&lt;p&gt;Safe&lt;/p&gt;</description></item></channel></rss>`,
  });

  assert.equal(parsed.feedTitle, "A & B");
  assert.equal(parsed.items[0]?.title, "Item");
  assert.equal(parsed.items[0]?.descriptionHtml, "<p>Safe</p>");
});

test("drops malformed and non-HTTP feed URLs", () => {
  const parsed = parseNativeFeed({
    url: "https://example.com/feed.xml",
    bodyText: `<rss version="2.0"><channel><title>Unsafe links</title><link>javascript:alert(1)</link><item><guid>1</guid><title>Item</title><link>http://[</link><enclosure url="data:text/plain,no" type="image/png" /></item></channel></rss>`,
  });

  assert.equal(parsed.siteUrl, null);
  assert.equal(parsed.items[0]?.url, null);
  assert.equal(parsed.items[0]?.imageUrl, null);
});
