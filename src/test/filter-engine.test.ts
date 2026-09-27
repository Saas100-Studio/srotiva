import assert from "node:assert/strict";
import test from "node:test";

import { FeedFilterType } from "@prisma/client";

import { applyFilters, type KeywordFilter } from "../lib/feed/filter-engine.ts";

const item = {
  title: "Security Release",
  descriptionText: "A sponsored update for ACME users",
  canonicalUrl: "https://example.com/releases/security",
  url: "https://example.com/releases/security",
  author: "Märta Dev",
};

function filter(
  type: FeedFilterType,
  keywords: string[],
  field = "any",
  id = crypto.randomUUID(),
): KeywordFilter {
  return { id, type, field, value: { keywords }, isEnabled: true };
}

test("keyword filters are deterministic, normalized, and blacklist-first", () => {
  assert.deepEqual(applyFilters({ item, filters: [] }), { included: true, reason: null });

  const titleBlacklist = filter(FeedFilterType.BLACKLIST, ["  SECURITY  "], "title", "title-block");
  assert.deepEqual(applyFilters({ item, filters: [titleBlacklist] }), {
    included: false,
    reason: {
      code: "BLACKLIST_MATCH",
      type: "blacklist",
      filterId: "title-block",
      field: "title",
      keyword: "security",
    },
  });

  assert.equal(applyFilters({
    item,
    filters: [filter(FeedFilterType.BLACKLIST, ["SPONSORED"], "description")],
  }).included, false);
  assert.equal(applyFilters({
    item,
    filters: [filter(FeedFilterType.WHITELIST, ["ma\u0308rta"], "author")],
  }).included, true);
  assert.equal(applyFilters({
    item,
    filters: [filter(FeedFilterType.WHITELIST, ["not-present"])],
  }).included, false);
  assert.equal(applyFilters({
    item,
    filters: [
      filter(FeedFilterType.WHITELIST, ["security"]),
      filter(FeedFilterType.BLACKLIST, ["sponsored"]),
    ],
  }).reason?.code, "BLACKLIST_MATCH");
  assert.equal(applyFilters({
    item,
    filters: [filter(FeedFilterType.WHITELIST, ["/RELEASES/SECURITY"], "url")],
  }).included, true);
});
