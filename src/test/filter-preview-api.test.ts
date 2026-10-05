import assert from "node:assert/strict";
import test from "node:test";

import { FeedFilterScope, FeedFilterType, FeedSourceType } from "@prisma/client";

import { handleFilterPreview } from "../app/api/feeds/[feedId]/filters/preview/route.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import { createFeed } from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";

function request(cookie: string, body: unknown) {
  return new Request("http://localhost/api/feeds/feed/filters/preview", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("filter preview combines saved rules with a candidate and does not persist item state", async () => {
  assert.ok(process.env.DATABASE_URL);
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const owner = await createUser({ email: `preview-owner-${suffix}@srotiva.test`, passwordHash: "hash" });
  const viewer = await createUser({ email: `preview-viewer-${suffix}@srotiva.test`, passwordHash: "hash" });
  const workspace = await createWorkspaceWithOwner({ userId: owner.id, name: "Preview", slug: `preview-${suffix}` });
  await db.workspaceMember.create({ data: {
    workspaceId: workspace.id,
    userId: viewer.id,
    role: "VIEWER",
    joinedAt: new Date(),
  } });
  const feed = await createFeed({
    workspaceId: workspace.id,
    createdByUserId: owner.id,
    name: "Preview Feed",
    slug: `preview-feed-${suffix}`,
    sourceType: FeedSourceType.NATIVE,
    sourceUrl: "https://example.com/feed.xml",
    refreshIntervalMinutes: 60,
  });
  await db.feedFilter.create({ data: {
    workspaceId: workspace.id,
    feedId: feed.id,
    scope: FeedFilterScope.FEED,
    type: FeedFilterType.WHITELIST,
    field: "any",
    operator: "contains",
    value: { keywords: ["security"] },
  } });
  await db.feedItem.createMany({ data: [
    {
      workspaceId: workspace.id,
      feedId: feed.id,
      fingerprint: `included-${suffix}`,
      url: "https://example.com/security-release",
      title: "Security release",
      descriptionText: "A regular update",
    },
    {
      workspaceId: workspace.id,
      feedId: feed.id,
      fingerprint: `blacklisted-${suffix}`,
      url: "https://example.com/sponsored-security",
      title: "Security sponsor",
      descriptionText: "Sponsored report",
    },
    {
      workspaceId: workspace.id,
      feedId: feed.id,
      fingerprint: `whitelist-${suffix}`,
      url: "https://example.com/cooking",
      title: "Cooking notes",
      descriptionText: "Recipes",
    },
    ...Array.from({ length: 205 }, (_, index) => ({
      workspaceId: workspace.id,
      feedId: feed.id,
      fingerprint: `batch-${index}-${suffix}`,
      url: `https://example.com/security/${index}`,
      title: `Security batch ${index}`,
      descriptionText: "Regular report",
    })),
  ] });
  const before = await db.feedItem.findMany({
    where: { feedId: feed.id },
    select: { id: true, status: true, filterReason: true },
    orderBy: { id: "asc" },
  });
  const ownerCookie = createSessionCookie(owner.id, { secure: false });
  const viewerCookie = createSessionCookie(viewer.id, { secure: false });

  try {
    const denied = await handleFilterPreview(request(viewerCookie, {
      workspaceId: workspace.id,
      type: "blacklist",
      field: "description",
      keywords: ["sponsored"],
    }), feed.id);
    assert.equal(denied.status, 403);

    const response = await handleFilterPreview(request(ownerCookie, {
      workspaceId: workspace.id,
      type: "blacklist",
      field: "description",
      keywords: ["sponsored"],
      isEnabled: true,
    }), feed.id);
    assert.equal(response.status, 200);
    const preview = (await response.json() as { data: {
      includedCount: number;
      excludedCount: number;
      includedItems: Array<{ title: string }>;
      excludedItems: Array<{ title: string; reason: { code: string; keyword?: string } }>;
    } }).data;
    assert.equal(preview.includedCount, 206);
    assert.equal(preview.excludedCount, 2);
    assert.equal(preview.includedItems.length, 10);
    assert.equal(preview.excludedItems.length, 2);
    assert.ok(preview.includedItems.every((item) => item.title.includes("Security")));
    assert.deepEqual(
      preview.excludedItems.find((item) => item.title === "Security sponsor")?.reason,
      { code: "BLACKLIST_MATCH", type: "blacklist", filterId: "preview", field: "description", keyword: "sponsored" },
    );

    const after = await db.feedItem.findMany({
      where: { feedId: feed.id },
      select: { id: true, status: true, filterReason: true },
      orderBy: { id: "asc" },
    });
    assert.deepEqual(after, before);
    assert.equal(await db.feedFilter.count({ where: { feedId: feed.id } }), 1);
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, viewer.id] } } });
  }
});
