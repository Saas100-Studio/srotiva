import assert from "node:assert/strict";
import test from "node:test";

import { FeedSourceType, FeedStatus, RefreshJobStatus, RefreshTrigger } from "@prisma/client";

import { getDb } from "../lib/db/client.ts";
import { createFeed } from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";
import {
  enqueueDueRefreshJobs,
  nextFailedRefreshAt,
  nextSuccessfulRefreshAt,
} from "../lib/feed/refresh-schedule.ts";

test("refresh schedule calculates success and capped exponential failure times", () => {
  const now = new Date("2026-09-27T12:00:00.000Z");
  assert.deepEqual(nextSuccessfulRefreshAt(now, 60), new Date("2026-09-27T13:00:00.000Z"));
  assert.deepEqual(nextFailedRefreshAt(now, 60, 1), new Date("2026-09-27T13:00:00.000Z"));
  assert.deepEqual(nextFailedRefreshAt(now, 60, 2), new Date("2026-09-27T14:00:00.000Z"));
  assert.deepEqual(nextFailedRefreshAt(now, 60, 10), new Date("2026-09-28T12:00:00.000Z"));
});

test("scheduler enqueues only due refreshable feeds without duplicate job storms", async () => {
  assert.ok(process.env.DATABASE_URL);
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const user = await createUser({ email: `scheduler-${suffix}@srotiva.test`, passwordHash: "test" });
  const workspace = await createWorkspaceWithOwner({
    userId: user.id,
    name: "Scheduler Test",
    slug: `scheduler-${suffix}`,
  });
  const makeFeed = (name: string) => createFeed({
    workspaceId: workspace.id,
    createdByUserId: user.id,
    name,
    slug: `${name.toLowerCase()}-${suffix}`,
    sourceType: FeedSourceType.NATIVE,
    sourceUrl: `https://example.com/${name.toLowerCase()}.xml`,
    refreshIntervalMinutes: 60,
  });

  try {
    const [due, unscheduled, paused, future, duplicate, cooling] = await Promise.all([
      makeFeed("Due"),
      makeFeed("Unscheduled"),
      makeFeed("Paused"),
      makeFeed("Future"),
      makeFeed("Duplicate"),
      makeFeed("Cooling"),
    ]);
    const now = new Date();
    const past = new Date(now.getTime() - 60_000);
    const later = new Date(now.getTime() + 60_000);
    await Promise.all([
      db.feed.update({ where: { id: due.id }, data: { status: FeedStatus.ACTIVE, nextRefreshAt: past } }),
      db.feed.update({ where: { id: unscheduled.id }, data: { status: FeedStatus.ACTIVE, nextRefreshAt: null } }),
      db.feed.update({ where: { id: paused.id }, data: { status: FeedStatus.PAUSED, nextRefreshAt: past } }),
      db.feed.update({ where: { id: future.id }, data: { status: FeedStatus.ACTIVE, nextRefreshAt: later } }),
      db.feed.update({ where: { id: duplicate.id }, data: { status: FeedStatus.ACTIVE, nextRefreshAt: past } }),
      db.feed.update({ where: { id: cooling.id }, data: { status: FeedStatus.FAILED, nextRefreshAt: later, failureCount: 2 } }),
    ]);
    await db.feedRefreshJob.create({
      data: {
        workspaceId: workspace.id,
        feedId: duplicate.id,
        trigger: RefreshTrigger.SCHEDULED,
        status: RefreshJobStatus.QUEUED,
      },
    });

    const concurrentPasses = await Promise.all(
      Array.from({ length: 8 }, () => enqueueDueRefreshJobs(now)),
    );
    const enqueued = concurrentPasses.flat();
    assert.equal(enqueued.filter((feedId) => feedId === due.id).length, 1);
    assert.ok(!enqueued.includes(unscheduled.id));
    assert.ok(!enqueued.includes(paused.id));
    assert.ok(!enqueued.includes(future.id));
    assert.ok(!enqueued.includes(duplicate.id));
    assert.ok(!enqueued.includes(cooling.id));
    await enqueueDueRefreshJobs(now);
    const scheduled = await db.feedRefreshJob.findMany({
      where: { workspaceId: workspace.id, trigger: RefreshTrigger.SCHEDULED },
      select: { feedId: true },
      orderBy: { feedId: "asc" },
    });
    assert.deepEqual(scheduled.map((job) => job.feedId).sort(), [due.id, duplicate.id].sort());
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});
