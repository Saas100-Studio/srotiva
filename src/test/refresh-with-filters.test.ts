import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FeedFilterScope,
  FeedFilterType,
  FeedSourceType,
  FeedStatus,
  FeedVisibility,
  RefreshTrigger,
} from "@prisma/client";

import { GET as getJson } from "../app/f/[slug]/json/route.ts";
import { getDb } from "../lib/db/client.ts";
import { createFeed } from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";
import { refreshFeed } from "../lib/feed/refresh-feed.ts";

const rss = readFileSync(new URL("./fixtures/rss-basic.xml", import.meta.url), "utf8");
const dependencies = {
  checkRobotsAllowed: async () => true,
  getCrawlerUserAgent: () => "MorselTest/1.0",
  fetchDocument: async (url: string | URL) => ({
    finalUrl: url.toString(),
    status: 200,
    headers: {},
    contentType: "application/rss+xml",
    bodyText: rss,
    bytes: Buffer.byteLength(rss),
    durationMs: 1,
  }),
};

test("refresh stores filter decisions, updates them when rules change, and excludes filtered output", async (t) => {
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const user = await createUser({ email: `filters-${suffix}@morsel.test`, passwordHash: "test" });
  const workspace = await createWorkspaceWithOwner({ userId: user.id, name: "Filters", slug: `filters-${suffix}` });
  const feed = await createFeed({
    workspaceId: workspace.id,
    createdByUserId: user.id,
    name: "Filtered feed",
    slug: `filtered-${suffix}`,
    sourceType: FeedSourceType.NATIVE,
    sourceUrl: "https://example.com/feed.xml",
    refreshIntervalMinutes: 60,
  });
  await db.feed.update({
    where: { id: feed.id },
    data: { status: FeedStatus.ACTIVE, visibility: FeedVisibility.PUBLIC },
  });
  const rule = await db.feedFilter.create({
    data: {
      workspaceId: workspace.id,
      feedId: feed.id,
      scope: FeedFilterScope.FEED,
      type: FeedFilterType.BLACKLIST,
      field: "title",
      value: { keywords: ["first rss"] },
    },
  });

  t.after(async () => {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  });

  await refreshFeed({ feedId: feed.id, trigger: RefreshTrigger.SCHEDULED }, dependencies);
  const filtered = await db.feedItem.findFirstOrThrow({ where: { feedId: feed.id } });
  assert.equal(filtered.status, "FILTERED");
  assert.deepEqual(filtered.filterReason, {
    code: "BLACKLIST_MATCH",
    type: "blacklist",
    filterId: rule.id,
    field: "title",
    keyword: "first rss",
  });

  const output = await getJson(new Request(`http://localhost/f/${feed.outputSlug}/json`), {
    params: Promise.resolve({ slug: feed.outputSlug }),
  });
  assert.equal(output.status, 200);
  assert.deepEqual((await output.json() as { items: unknown[] }).items, []);

  await db.feedFilter.update({ where: { id: rule.id }, data: { isEnabled: false } });
  const refreshed = await refreshFeed({ feedId: feed.id, trigger: RefreshTrigger.SCHEDULED }, dependencies);
  assert.deepEqual(refreshed, { itemsFound: 1, itemsNew: 0, itemsChanged: 1 });
  const active = await db.feedItem.findFirstOrThrow({ where: { feedId: feed.id } });
  assert.equal(active.status, "ACTIVE");
  assert.equal(active.filterReason, null);
});
