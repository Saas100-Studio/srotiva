import assert from "node:assert/strict";
import test from "node:test";

import { createItemFingerprint } from "../lib/feed/fingerprint.ts";

test("fingerprints are deterministic for the same canonical URL", () => {
  const input = {
    feedUrl: "https://example.com/feed.xml",
    canonicalUrl: "https://example.com/posts/1",
    sourceItemId: "ignored-guid",
  };

  assert.equal(createItemFingerprint(input), createItemFingerprint(input));
});

test("the feed URL separates otherwise identical item URLs", () => {
  const canonicalUrl = "https://example.com/posts/1";
  assert.notEqual(
    createItemFingerprint({ feedUrl: "https://one.example/feed", canonicalUrl }),
    createItemFingerprint({ feedUrl: "https://two.example/feed", canonicalUrl }),
  );
});

test("falls back to normalized title and date without a URL or source ID", () => {
  assert.equal(
    createItemFingerprint({
      feedUrl: "https://example.com/feed",
      title: "  An   Item ",
      datePublished: "2025-09-03T13:00:00.000Z",
    }),
    createItemFingerprint({
      feedUrl: "https://example.com/feed",
      title: "an item",
      datePublished: new Date("2025-09-03T13:00:00Z"),
    }),
  );
});

test("normalizes titles without the host locale", () => {
  const input = {
    feedUrl: "https://example.com/feed",
    title: "Istanbul",
    datePublished: "2025-09-03T13:00:00Z",
  };

  assert.equal(
    createItemFingerprint(input),
    createItemFingerprint({ ...input, title: "istanbul" }),
  );
});
