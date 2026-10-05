import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { SrotivaApiError } from "../lib/api/errors.ts";
import { extractItemsFromHtml } from "../lib/feed/html-extractor.ts";

const fixture = (name: string) => readFile(
  new URL(`./fixtures/${name}`, import.meta.url),
  "utf8",
);

test("extracts normalized, deduplicated article items", async () => {
  const result = extractItemsFromHtml({
    pageUrl: "https://example.com/blog/",
    bodyText: await fixture("html-article-list.html"),
  });

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0]?.title, "First story");
  assert.equal(result.items[0]?.canonicalUrl, "https://example.com/posts/one");
  assert.equal(result.items[0]?.imageUrl, "https://example.com/images/one.jpg");
  assert.equal(result.items[0]?.datePublished?.toISOString(), "2026-09-25T10:00:00.000Z");
  assert.equal(result.items[0]?.descriptionText, "First summary");
  assert.equal(result.items[0]?.descriptionHtml, null);
  assert.match(result.items[0]?.fingerprint ?? "", /^[a-f\d]{64}$/);
  assert.deepEqual(result.warnings, ["SOME_ITEMS_MISSING_DATE"]);
  assert.equal(result.confidence, 0.97);
});

test("extracts repeated heading cards and limits previews to 25", async () => {
  const bodyText = await fixture("html-card-grid.html");
  const result = extractItemsFromHtml({ pageUrl: "https://example.com/blog/", bodyText });
  assert.deepEqual(result.items.map((item) => item.title), ["Alpha", "Beta", "Gamma"]);
  assert.equal(result.items[0]?.canonicalUrl, "https://example.com/blog/news/a");

  const cards = Array.from({ length: 30 }, (_, index) =>
    `<article><h2><a href="/${index}">Item ${index}</a></h2></article>`,
  ).join("");
  assert.equal(extractItemsFromHtml({
    pageUrl: "https://example.com/",
    bodyText: `<main>${cards}</main>`,
  }).items.length, 25);
});

test("rejects pages without a repeated item pattern", async () => {
  const bodyText = await fixture("html-no-items.html");
  assert.throws(
    () => extractItemsFromHtml({
      pageUrl: "https://example.com/about",
      bodyText,
    }),
    (error: unknown) => error instanceof SrotivaApiError && error.code === "NO_ITEMS_EXTRACTED",
  );
});

test("falls back from incidental articles to valid heading cards", () => {
  const result = extractItemsFromHtml({
    pageUrl: "https://example.com/",
    bodyText: `<main>
      <article>Unlinked notice</article><article>Another notice</article>
      <div><h2><a href="/a">A</a></h2><p>A summary</p></div>
      <div><h2><a href="/b">B</a></h2><p>B summary</p></div>
      <div><h2><a href="/c">C</a></h2><p>C summary</p></div>
    </main>`,
  });

  assert.deepEqual(result.items.map((item) => item.title), ["A", "B", "C"]);
});

test("rejects a low-confidence pair of bare links", () => {
  assert.throws(
    () => extractItemsFromHtml({
      pageUrl: "https://example.com/",
      bodyText: `<main>
        <article><h2><a href="/a">A</a></h2></article>
        <article><h2><a href="/b">B</a></h2></article>
      </main>`,
    }),
    (error: unknown) => {
      assert.ok(error instanceof SrotivaApiError);
      assert.equal(error.code, "NO_ITEMS_EXTRACTED");
      assert.deepEqual(error.details.warnings, [
        "LOW_CONFIDENCE",
        "SOME_ITEMS_MISSING_DESCRIPTION",
        "SOME_ITEMS_MISSING_IMAGE",
        "SOME_ITEMS_MISSING_DATE",
      ]);
      return true;
    },
  );
});
