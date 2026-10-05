import {
  RefreshJobStatus,
  type FeedRefreshJob,
  type RefreshTrigger,
} from "@prisma/client";

import { getDb } from "../db/client.ts";
import { claimQueuedRefreshJob } from "./job-locks.ts";

export const DEFAULT_STALE_JOB_AGE_MS = 15 * 60_000;

export type RefreshJobResult = {
  itemsFound: number;
  itemsNew: number;
  itemsChanged: number;
};

export type RefreshJobError = {
  code: string;
  message: string;
};

export function enqueueRefreshJob({
  workspaceId,
  feedId,
  trigger,
  priority = 0,
}: {
  workspaceId: string;
  feedId: string;
  trigger: RefreshTrigger;
  priority?: number;
}): Promise<FeedRefreshJob> {
  return getDb().feedRefreshJob.create({
    data: {
      workspaceId,
      feedId,
      trigger,
      priority,
      status: RefreshJobStatus.QUEUED,
    },
  });
}

export function claimNextRefreshJob({
  workerId,
}: {
  workerId: string;
}): Promise<FeedRefreshJob | null> {
  if (!workerId.trim()) {
    throw new TypeError("workerId must not be empty");
  }

  return claimQueuedRefreshJob(workerId);
}

export async function reclaimStaleRefreshJobs({
  now = new Date(),
  staleAfterMs = DEFAULT_STALE_JOB_AGE_MS,
}: {
  now?: Date;
  staleAfterMs?: number;
} = {}): Promise<number> {
  if (!Number.isSafeInteger(staleAfterMs) || staleAfterMs <= 0) {
    throw new TypeError("staleAfterMs must be a positive integer");
  }

  const staleBefore = new Date(now.getTime() - staleAfterMs);
  const reclaimed = await getDb().feedRefreshJob.updateMany({
    where: {
      status: RefreshJobStatus.RUNNING,
      lockedAt: { lt: staleBefore },
    },
    data: {
      status: RefreshJobStatus.QUEUED,
      startedAt: null,
      finishedAt: null,
      lockedAt: null,
      lockedBy: null,
      nextRetryAt: now,
    },
  });

  return reclaimed.count;
}

export async function completeRefreshJob({
  jobId,
  result,
  workerId,
}: {
  jobId: string;
  result: RefreshJobResult;
  workerId: string;
}): Promise<FeedRefreshJob> {
  if (!workerId.trim()) throw new TypeError("workerId must not be empty");
  const updated = await getDb().feedRefreshJob.updateMany({
    where: { id: jobId, status: RefreshJobStatus.RUNNING, lockedBy: workerId },
    data: {
      status: RefreshJobStatus.SUCCEEDED,
      finishedAt: new Date(),
      itemsFound: result.itemsFound,
      itemsNew: result.itemsNew,
      itemsChanged: result.itemsChanged,
      errorCode: null,
      errorMessage: null,
      nextRetryAt: null,
    },
  });

  if (updated.count !== 1) {
    throw new Error(`Refresh job ${jobId} is not running`);
  }

  return getDb().feedRefreshJob.findUniqueOrThrow({ where: { id: jobId } });
}

export async function failRefreshJob({
  jobId,
  error,
  retryAt = null,
  workerId,
}: {
  jobId: string;
  error: RefreshJobError;
  retryAt?: Date | null;
  workerId: string;
}): Promise<FeedRefreshJob> {
  if (!workerId.trim()) throw new TypeError("workerId must not be empty");
  const updated = await getDb().feedRefreshJob.updateMany({
    where: { id: jobId, status: RefreshJobStatus.RUNNING, lockedBy: workerId },
    data: {
      status: RefreshJobStatus.FAILED,
      finishedAt: new Date(),
      errorCode: error.code,
      errorMessage: error.message,
      nextRetryAt: retryAt,
    },
  });

  if (updated.count !== 1) {
    throw new Error(`Refresh job ${jobId} is not running`);
  }

  return getDb().feedRefreshJob.findUniqueOrThrow({ where: { id: jobId } });
}
