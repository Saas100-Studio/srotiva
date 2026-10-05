import assert from "node:assert/strict";
import test from "node:test";
import { XMLValidator } from "fast-xml-parser";

import { getRenderCacheControl } from "../lib/feed/render-cache.ts";
import { renderCsvFeed } from "../lib/feed/render-csv.ts";
import { renderJsonFeed } from "../lib/feed/render-json.ts";
import { renderRssFeed } from "../lib/feed/render-rss.ts";
import type { NativeFeedItem } from "../lib/feed/native-parser.ts";

const item: NativeFeedItem = {
  sourceItemId: "source-1",
  fingerprint: "fingerprint-1",
  canonicalUrl: "https://example.com/posts/1?a=1&b=2",
  url: "https://example.com/posts/1?a=1&b=2",
  title: "One <item> & more",
  descriptionText: "Description",
  descriptionHtml: "<p>Description</p>",
  author: "Writer",
  imageUrl: null,
  datePublished: new Date("2026-01-02T03:04:05.000Z"),
  dateModified: null,
  raw: {},
};

const feed = {
  feedTitle: "Srotiva & Friends",
  feedDescription: "A <useful> feed",
  siteUrl: "https://example.com/",
};

test("renders deterministic RSS with required fields and escaped XML", () => {
  const input = { feed, items: [item], selfUrl: "https://feeds.example/rss?a=1&b=2" };
  const output = renderRssFeed(input);

  assert.equal(output, renderRssFeed(input));
  assert.equal(XMLValidator.validate(output), true);
  assert.match(output, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(output, /<title>Srotiva &amp; Friends<\/title>/);
  assert.match(output, /<title>One &lt;item&gt; &amp; more<\/title>/);
  assert.match(output, /<link>https:\/\/example\.com\/posts\/1\?a=1&amp;b=2<\/link>/);
  assert.match(output, /<guid isPermaLink="false">source-1<\/guid>/);
  assert.match(output, /<dc:creator>Writer<\/dc:creator>/);
  assert.doesNotMatch(output, /<author>/);
  assert.match(output, /<pubDate>Fri, 02 Jan 2026 03:04:05 GMT<\/pubDate>/);
});

test("renders normalized JSON metadata, items, and ISO dates", () => {
  const output = JSON.parse(renderJsonFeed({ feed, items: [item] })) as {
    feed: typeof feed;
    items: Array<{ fingerprint: string; datePublished: string }>;
  };

  assert.deepEqual(output.feed, feed);
  assert.equal(output.items[0]?.fingerprint, "fingerprint-1");
  assert.equal(output.items[0]?.datePublished, "2026-01-02T03:04:05.000Z");
  assert.equal("raw" in output.items[0]!, false);
  assert.equal("workspaceId" in output.items[0]!, false);
});

test("renders stable CSV columns and valid empty outputs", () => {
  const header = "sourceItemId,fingerprint,canonicalUrl,url,title,descriptionText,descriptionHtml,author,imageUrl,datePublished,dateModified";

  assert.equal(renderCsvFeed({ items: [] }), header);
  assert.match(renderCsvFeed({ items: [item] }), new RegExp(`^${header}\\r\\n`));
  const emptyRss = renderRssFeed({
    feed: { feedTitle: null, feedDescription: null, siteUrl: null },
    items: [],
    selfUrl: "https://feeds.example/rss",
  });
  assert.equal(XMLValidator.validate(emptyRss), true);
  assert.match(emptyRss, /<title><\/title>/);
  assert.deepEqual(JSON.parse(renderJsonFeed({ feed, items: [] })).items, []);
});

test("returns cache policy metadata for public and private routes", () => {
  assert.equal(getRenderCacheControl("public"), "public, max-age=60, stale-while-revalidate=300");
  assert.equal(getRenderCacheControl("private"), "private, no-store");
});
