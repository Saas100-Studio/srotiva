import { Prisma, type FeedRefreshJob } from "@prisma/client";

import { getDb } from "../db/client.ts";

export async function claimQueuedRefreshJob(
  workerId: string,
): Promise<FeedRefreshJob | null> {
  const [claimed] = await getDb().$queryRaw<Array<{ id: string }>>(Prisma.sql`
    WITH next_job AS (
      SELECT id
      FROM feed_refresh_jobs
      WHERE status = 'queued'
        AND locked_at IS NULL
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY priority DESC, created_at ASC, id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE feed_refresh_jobs AS job
    SET status = 'running',
        locked_at = NOW(),
        locked_by = ${workerId},
        started_at = COALESCE(started_at, NOW()),
        attempt = attempt + 1
    FROM next_job
    WHERE job.id = next_job.id
    RETURNING job.id
  `);

  return claimed
    ? getDb().feedRefreshJob.findUniqueOrThrow({ where: { id: claimed.id } })
    : null;
}
