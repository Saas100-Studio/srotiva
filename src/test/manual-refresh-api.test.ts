import assert from "node:assert/strict";
import test from "node:test";

import { FeedSourceType, FeedStatus } from "@prisma/client";

import { handleManualRefresh } from "../app/api/feeds/[feedId]/refresh/route.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import { createFeed } from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";

function request(cookie: string | null, workspaceId: string) {
  return new Request("http://localhost/api/feeds/feed/refresh", {
    method: "POST",
    headers: {
      ...(cookie ? { cookie } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ workspaceId }),
  });
}

test("manual refresh API authorizes, throttles atomically, and rejects paused feeds", async () => {
  assert.ok(process.env.DATABASE_URL);
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const owner = await createUser({ email: `manual-owner-${suffix}@srotiva.test`, passwordHash: "hash" });
  const editor = await createUser({ email: `manual-editor-${suffix}@srotiva.test`, passwordHash: "hash" });
  const viewer = await createUser({ email: `manual-viewer-${suffix}@srotiva.test`, passwordHash: "hash" });
  const workspace = await createWorkspaceWithOwner({ userId: owner.id, name: "Manual", slug: `manual-${suffix}` });
  await db.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: editor.id, role: "EDITOR", joinedAt: new Date() },
    { workspaceId: workspace.id, userId: viewer.id, role: "VIEWER", joinedAt: new Date() },
  ] });
  const feed = await createFeed({
    workspaceId: workspace.id,
    createdByUserId: owner.id,
    name: "Manual Feed",
    slug: "manual-feed",
    sourceType: FeedSourceType.NATIVE,
    sourceUrl: "https://example.com/feed.xml",
    refreshIntervalMinutes: 60,
  });
  await db.feed.update({ where: { id: feed.id }, data: { status: FeedStatus.ACTIVE } });
  const editorCookie = createSessionCookie(editor.id, { secure: false });
  const viewerCookie = createSessionCookie(viewer.id, { secure: false });

  try {
    const unauthenticated = await handleManualRefresh(request(null, workspace.id), feed.id);
    assert.equal(unauthenticated.status, 401);
    assert.equal((await unauthenticated.json() as { error: { code: string } }).error.code, "UNAUTHORIZED");

    const denied = await handleManualRefresh(request(viewerCookie, workspace.id), feed.id);
    assert.equal(denied.status, 403);
    assert.equal((await denied.json() as { error: { code: string } }).error.code, "FORBIDDEN");

    const [first, second] = await Promise.all([
      handleManualRefresh(request(editorCookie, workspace.id), feed.id),
      handleManualRefresh(request(editorCookie, workspace.id), feed.id),
    ]);
    const responses = [first, second].sort((a, b) => a.status - b.status);
    assert.deepEqual(responses.map(({ status }) => status), [202, 429]);
    const success = await responses[0]!.json() as { data: { job: { status: string; trigger: string }; cooldownSeconds: number } };
    const throttled = await responses[1]!.json() as { error: { code: string; details: { secondsRemaining: number } } };
    assert.equal(success.data.job.status, "QUEUED");
    assert.equal(success.data.job.trigger, "MANUAL");
    assert.equal(success.data.cooldownSeconds, Number(process.env.MANUAL_REFRESH_COOLDOWN_SECONDS));
    assert.equal(throttled.error.code, "REFRESH_THROTTLED");
    assert.ok(throttled.error.details.secondsRemaining > 0);
    assert.equal(await db.feedRefreshJob.count({ where: { feedId: feed.id, trigger: "MANUAL" } }), 1);
    assert.equal(await db.auditLog.count({ where: {
      workspaceId: workspace.id,
      actorUserId: editor.id,
      action: "feed.manual_refresh_requested",
      targetId: feed.id,
    } }), 1);

    await db.feed.update({ where: { id: feed.id }, data: { status: FeedStatus.PAUSED } });
    const paused = await handleManualRefresh(request(editorCookie, workspace.id), feed.id);
    assert.equal(paused.status, 409);
    assert.equal((await paused.json() as { error: { code: string } }).error.code, "FEED_PAUSED");
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, editor.id, viewer.id] } } });
  }
});
