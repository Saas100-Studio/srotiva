import { RefreshJobStatus, RefreshTrigger } from "@prisma/client";

import { getDb } from "../db/client.ts";

const MAX_BACKOFF_MINUTES = 24 * 60;

export function nextSuccessfulRefreshAt(
  now: Date,
  refreshIntervalMinutes: number,
): Date {
  return new Date(now.getTime() + refreshIntervalMinutes * 60_000);
}

export function nextFailedRefreshAt(
  now: Date,
  refreshIntervalMinutes: number,
  failureCount: number,
): Date {
  const delayMinutes = Math.min(
    refreshIntervalMinutes * (2 ** Math.max(0, failureCount - 1)),
    MAX_BACKOFF_MINUTES,
  );
  return new Date(now.getTime() + delayMinutes * 60_000);
}

// ponytail: one pass queues at most 100 feeds; loop or shard only when queue lag proves it necessary.
export async function enqueueDueRefreshJobs(now = new Date(), limit = 100) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new TypeError("limit must be an integer between 1 and 1000");
  }

  return getDb().$transaction(async (tx) => {
    const feeds = await tx.$queryRaw<Array<{ id: string; workspaceId: string }>>`
      SELECT feed.id, feed.workspace_id AS "workspaceId"
      FROM feeds AS feed
      WHERE feed.deleted_at IS NULL
        AND feed.status IN ('active'::feed_status, 'degraded'::feed_status, 'failed'::feed_status)
        AND feed.next_refresh_at <= ${now}
        AND NOT EXISTS (
          SELECT 1
          FROM feed_refresh_jobs AS job
          WHERE job.feed_id = feed.id
            AND job.status IN ('queued'::refresh_job_status, 'running'::refresh_job_status)
        )
      ORDER BY feed.next_refresh_at ASC, feed.id ASC
      LIMIT ${limit}
      FOR UPDATE OF feed SKIP LOCKED
    `;

    if (feeds.length) {
      await tx.feedRefreshJob.createMany({
        data: feeds.map((feed) => ({
          workspaceId: feed.workspaceId,
          feedId: feed.id,
          trigger: RefreshTrigger.SCHEDULED,
          status: RefreshJobStatus.QUEUED,
        })),
      });
    }

    return feeds.map((feed) => feed.id);
  });
}
