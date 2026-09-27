import assert from "node:assert/strict";
import { test } from "node:test";

import { RefreshJobStatus, RefreshTrigger, type FeedRefreshJob } from "@prisma/client";

import { MorselApiError } from "../lib/api/errors.ts";
import { processNextRefreshJob } from "../workers/refresh-worker.ts";

function job(): FeedRefreshJob {
  return {
    id: crypto.randomUUID(),
    workspaceId: crypto.randomUUID(),
    feedId: crypto.randomUUID(),
    trigger: RefreshTrigger.SCHEDULED,
    status: RefreshJobStatus.RUNNING,
    priority: 0,
    startedAt: new Date(),
    finishedAt: null,
    lockedAt: new Date(),
    lockedBy: "worker-test",
    nextRetryAt: null,
    attempt: 1,
    itemsFound: 0,
    itemsNew: 0,
    itemsChanged: 0,
    errorCode: null,
    errorMessage: null,
    metadata: {},
    createdAt: new Date(),
  };
}

test("one-shot worker completes one claimed job", async () => {
  const claimed = job();
  let completed = false;
  const result = await processNextRefreshJob("worker-test", {
    claimNextRefreshJob: async () => claimed,
    refreshFeed: async () => ({ itemsFound: 2, itemsNew: 1, itemsChanged: 0 }),
    completeRefreshJob: async ({ workerId }) => {
      assert.equal(workerId, "worker-test");
      completed = true;
      return { ...claimed, status: RefreshJobStatus.SUCCEEDED };
    },
  });
  assert.equal(completed, true);
  assert.equal(result?.status, "succeeded");
});

test("one-shot worker records a failed claimed job", async () => {
  const claimed = job();
  let failureCode: string | undefined;
  const result = await processNextRefreshJob("worker-test", {
    claimNextRefreshJob: async () => claimed,
    refreshFeed: async () => { throw new MorselApiError(502, "FETCH_TIMEOUT", "Timed out."); },
    failRefreshJob: async ({ error, workerId }) => {
      assert.equal(workerId, "worker-test");
      failureCode = error.code;
      return { ...claimed, status: RefreshJobStatus.FAILED };
    },
  });
  assert.equal(failureCode, "FETCH_TIMEOUT");
  assert.equal(result?.status, "failed");
});

test("completion write failures are not converted into refresh failures", async () => {
  const claimed = job();
  let failed = false;
  await assert.rejects(processNextRefreshJob("worker-test", {
    claimNextRefreshJob: async () => claimed,
    refreshFeed: async () => ({ itemsFound: 1, itemsNew: 1, itemsChanged: 0 }),
    completeRefreshJob: async () => { throw new Error("completion unavailable"); },
    failRefreshJob: async () => {
      failed = true;
      return { ...claimed, status: RefreshJobStatus.FAILED };
    },
  }), /completion unavailable/);
  assert.equal(failed, false);
});

test("one-shot worker exits cleanly when the queue is empty", async () => {
  assert.equal(await processNextRefreshJob("worker-test", {
    claimNextRefreshJob: async () => null,
  }), null);
});
