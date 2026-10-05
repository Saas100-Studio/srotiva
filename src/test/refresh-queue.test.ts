import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FeedSourceType,
  RefreshJobStatus,
  RefreshTrigger,
} from "@prisma/client";

import { getDb } from "../lib/db/client.ts";
import { createFeed } from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";
import {
  claimNextRefreshJob,
  completeRefreshJob,
  enqueueRefreshJob,
  failRefreshJob,
  reclaimStaleRefreshJobs,
} from "../lib/jobs/refresh-queue.ts";

test("database refresh queue lifecycle", async (t) => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must point to a migrated test database");

  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const user = await createUser({
    email: `queue-${suffix}@srotiva.test`,
    passwordHash: "test-password-hash",
  });
  const workspace = await createWorkspaceWithOwner({
    userId: user.id,
    name: "Queue Test Workspace",
    slug: `queue-${suffix}`,
  });
  const feed = await createFeed({
    workspaceId: workspace.id,
    createdByUserId: user.id,
    name: "Queue Test Feed",
    slug: "queue-test-feed",
    sourceType: FeedSourceType.NATIVE,
    sourceUrl: "https://example.com/feed.xml",
    refreshIntervalMinutes: 60,
  });
  const feeds = await Promise.all([
    Promise.resolve(feed),
    ...["high-oldest", "high-newer", "locked"].map((slug) => createFeed({
      workspaceId: workspace.id,
      createdByUserId: user.id,
      name: `Queue Test Feed ${slug}`,
      slug,
      sourceType: FeedSourceType.NATIVE,
      sourceUrl: `https://example.com/${slug}.xml`,
      refreshIntervalMinutes: 60,
    })),
  ]);

  try {
    const low = await enqueueRefreshJob({
      workspaceId: workspace.id,
      feedId: feeds[0]!.id,
      trigger: RefreshTrigger.SCHEDULED,
      priority: 1_000_000_000,
    });
    const oldestHigh = await enqueueRefreshJob({
      workspaceId: workspace.id,
      feedId: feeds[1]!.id,
      trigger: RefreshTrigger.MANUAL,
      priority: 2_000_000_000,
    });
    const newerHigh = await enqueueRefreshJob({
      workspaceId: workspace.id,
      feedId: feeds[2]!.id,
      trigger: RefreshTrigger.RETRY,
      priority: 2_000_000_000,
    });
    const locked = await enqueueRefreshJob({
      workspaceId: workspace.id,
      feedId: feeds[3]!.id,
      trigger: RefreshTrigger.ADMIN,
      priority: 2_100_000_000,
    });

    assert.equal(low.status, RefreshJobStatus.QUEUED);

    await Promise.all([
      db.feedRefreshJob.update({
        where: { id: oldestHigh.id },
        data: { createdAt: new Date("2026-01-01T00:00:00Z") },
      }),
      db.feedRefreshJob.update({
        where: { id: newerHigh.id },
        data: { createdAt: new Date("2026-01-02T00:00:00Z") },
      }),
      db.feedRefreshJob.update({
        where: { id: locked.id },
        data: { lockedAt: new Date(), lockedBy: "other-worker" },
      }),
    ]);

    await t.test("claims the oldest highest-priority unlocked job", async () => {
      const claimed = await claimNextRefreshJob({ workerId: "queue-test-worker" });

      assert.equal(claimed?.id, oldestHigh.id);
      assert.equal(claimed?.status, RefreshJobStatus.RUNNING);
      assert.equal(claimed?.lockedBy, "queue-test-worker");
      assert.equal(claimed?.attempt, 1);
      assert.ok(claimed?.startedAt);
      assert.ok(claimed?.lockedAt);

      const skipped = await db.feedRefreshJob.findUniqueOrThrow({ where: { id: locked.id } });
      assert.equal(skipped.status, RefreshJobStatus.QUEUED);
      assert.equal(skipped.lockedBy, "other-worker");
    });

    await t.test("completes a running job with result counts", async () => {
      await assert.rejects(
        completeRefreshJob({
          jobId: oldestHigh.id,
          result: { itemsFound: 5, itemsNew: 3, itemsChanged: 1 },
          workerId: "different-worker",
        }),
        /is not running/,
      );
      const completed = await completeRefreshJob({
        jobId: oldestHigh.id,
        result: { itemsFound: 5, itemsNew: 3, itemsChanged: 1 },
        workerId: "queue-test-worker",
      });

      assert.equal(completed.status, RefreshJobStatus.SUCCEEDED);
      assert.equal(completed.itemsFound, 5);
      assert.equal(completed.itemsNew, 3);
      assert.equal(completed.itemsChanged, 1);
      assert.ok(completed.finishedAt);
    });

    await t.test("fails a running job with a recorded error", async () => {
      const claimed = await claimNextRefreshJob({ workerId: "queue-test-worker" });
      assert.equal(claimed?.id, newerHigh.id);

      const retryAt = new Date("2026-01-03T00:00:00Z");
      const failed = await failRefreshJob({
        jobId: newerHigh.id,
        error: { code: "FETCH_FAILED", message: "Source fetch failed" },
        retryAt,
        workerId: "queue-test-worker",
      });

      assert.equal(failed.status, RefreshJobStatus.FAILED);
      assert.equal(failed.errorCode, "FETCH_FAILED");
      assert.equal(failed.errorMessage, "Source fetch failed");
      assert.deepEqual(failed.nextRetryAt, retryAt);
      assert.ok(failed.finishedAt);
    });

    await t.test("requeues a stale running job and clears its ownership", async () => {
      await db.feedRefreshJob.update({
        where: { id: low.id },
        data: {
          status: RefreshJobStatus.RUNNING,
          lockedAt: new Date("2026-01-01T00:00:00Z"),
          lockedBy: "crashed-worker",
          startedAt: new Date("2026-01-01T00:00:00Z"),
        },
      });

      const now = new Date("2026-01-01T00:30:00Z");
      assert.equal(await reclaimStaleRefreshJobs({ now, staleAfterMs: 15 * 60_000 }), 1);
      const reclaimed = await db.feedRefreshJob.findUniqueOrThrow({ where: { id: low.id } });
      assert.equal(reclaimed.status, RefreshJobStatus.QUEUED);
      assert.equal(reclaimed.lockedAt, null);
      assert.equal(reclaimed.lockedBy, null);
      assert.equal(reclaimed.startedAt, null);
      assert.deepEqual(reclaimed.nextRetryAt, now);
    });
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
