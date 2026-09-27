import assert from "node:assert/strict";
import test from "node:test";

import { handleFeedDiagnosticsGet } from "../app/api/support/feeds/[feedId]/diagnostics/route.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import { createFeed } from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";

test("feed diagnostics are tenant-scoped and support-only", async (t) => {
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const owner = await createUser({ email: `diagnostics-owner-${suffix}@morsel.test`, passwordHash: "hash" });
  const support = await createUser({ email: `diagnostics-support-${suffix}@morsel.test`, passwordHash: "hash" });
  const invitedSupport = await createUser({ email: `diagnostics-invited-${suffix}@morsel.test`, passwordHash: "hash" });
  const workspace = await createWorkspaceWithOwner({ userId: owner.id, name: "Diagnostics", slug: `diagnostics-${suffix}` });
  await db.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: support.id, role: "SUPPORT", joinedAt: new Date() },
      { workspaceId: workspace.id, userId: invitedSupport.id, role: "SUPPORT", joinedAt: null },
    ],
  });
  const feed = await createFeed({
    workspaceId: workspace.id,
    createdByUserId: owner.id,
    name: "Diagnostic feed",
    slug: `diagnostic-${suffix}`,
    sourceType: "NATIVE",
    sourceUrl: "https://example.com/feed.xml",
    refreshIntervalMinutes: 60,
  });
  await db.feed.update({ where: { id: feed.id }, data: { status: "FAILED", publicTokenHash: "do-not-return" } });
  await db.feedItem.createMany({
    data: [
      { workspaceId: workspace.id, feedId: feed.id, fingerprint: `active-${suffix}`, status: "ACTIVE" },
      { workspaceId: workspace.id, feedId: feed.id, fingerprint: `filtered-${suffix}`, status: "FILTERED" },
    ],
  });
  const job = await db.feedRefreshJob.create({
    data: { workspaceId: workspace.id, feedId: feed.id, trigger: "SCHEDULED", status: "FAILED", errorCode: "FETCH_FAILED" },
  });
  await db.errorLog.create({
    data: {
      workspaceId: workspace.id,
      feedId: feed.id,
      jobId: job.id,
      severity: "ERROR",
      source: "refresh_worker",
      code: "FETCH_FAILED",
      message: "The source could not be fetched.",
      details: { token: "must-not-be-returned" },
    },
  });

  t.after(async () => {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, support.id, invitedSupport.id] } } });
    await db.$disconnect();
  });

  const url = `http://localhost/api/support/feeds/${feed.id}/diagnostics?workspaceId=${workspace.id}`;
  const ownerResponse = await handleFeedDiagnosticsGet(new Request(url, {
    headers: { cookie: createSessionCookie(owner.id, { secure: false }) },
  }), feed.id);
  assert.equal(ownerResponse.status, 403);

  const invitedResponse = await handleFeedDiagnosticsGet(new Request(url, {
    headers: { cookie: createSessionCookie(invitedSupport.id, { secure: false }) },
  }), feed.id);
  assert.notEqual(invitedResponse.status, 200);

  const supportResponse = await handleFeedDiagnosticsGet(new Request(url, {
    headers: { cookie: createSessionCookie(support.id, { secure: false }) },
  }), feed.id);
  const body = await supportResponse.json() as { data: {
    feed: { id: string; status: string; sourceUrl: string };
    lastRefreshJob: { id: string; errorCode: string };
    errorLogs: Array<{ code: string }>;
    itemCounts: Record<string, number>;
    outputUrls: Record<string, string>;
  } };
  assert.equal(supportResponse.status, 200);
  assert.equal(body.data.feed.id, feed.id);
  assert.equal(body.data.feed.status, "FAILED");
  assert.equal(body.data.lastRefreshJob.id, job.id);
  assert.equal(body.data.errorLogs[0]?.code, "FETCH_FAILED");
  assert.deepEqual(body.data.itemCounts, { active: 1, filtered: 1, hidden: 0, deleted: 0 });
  assert.match(body.data.outputUrls.rss, new RegExp(`/f/${feed.outputSlug}/rss$`));
  assert.doesNotMatch(JSON.stringify(body), /do-not-return|must-not-be-returned|publicTokenHash|details/u);
});
