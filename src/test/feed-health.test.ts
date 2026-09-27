import assert from "node:assert/strict";
import test from "node:test";

import { FeedStatus } from "@prisma/client";

import { getFeedHealth } from "../lib/feed/feed-health.ts";

const now = new Date("2026-09-27T12:00:00.000Z");
const base = {
  status: FeedStatus.ACTIVE,
  lastSuccessAt: new Date("2026-09-27T11:00:00.000Z"),
  lastFailureAt: null,
  nextRefreshAt: new Date("2026-09-27T13:00:00.000Z"),
  failureCount: 0,
};

test("feed health reports a recent successful refresh as healthy", () => {
  assert.deepEqual(getFeedHealth(base, now), {
    healthStatus: "healthy",
    healthMessage: "The latest refresh completed successfully.",
  });
});

test("feed health reports repeated failures and paused feeds", () => {
  assert.equal(getFeedHealth({
    ...base,
    status: FeedStatus.FAILED,
    lastFailureAt: now,
    failureCount: 3,
  }, now).healthStatus, "failed");
  assert.equal(getFeedHealth({ ...base, status: FeedStatus.PAUSED }, now).healthStatus, "paused");
});

test("feed health reports overdue feeds as stale and a first failure as degraded", () => {
  assert.equal(getFeedHealth({
    ...base,
    nextRefreshAt: new Date("2026-09-27T11:59:59.000Z"),
  }, now).healthStatus, "stale");
  assert.equal(getFeedHealth({
    ...base,
    status: FeedStatus.FAILED,
    failureCount: 1,
  }, now).healthStatus, "degraded");
});
