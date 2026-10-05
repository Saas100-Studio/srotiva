import {
  FeedStatus,
  RefreshJobStatus,
  RefreshTrigger,
} from "@prisma/client";

import { SrotivaApiError } from "../api/errors.ts";
import { writeAuditLog } from "../audit/audit-log.ts";
import { loadEnv } from "../config/env.ts";
import { getDb } from "../db/client.ts";
import { consumeManualRefreshQuota, lockWorkspace } from "../usage/workspace-quotas.ts";

const MANUAL_REFRESH_PRIORITY = 2_000_000_000;

export async function requestManualRefresh({
  workspaceId,
  feedId,
  actorUserId,
}: {
  workspaceId: string;
  feedId: string;
  actorUserId: string;
}) {
  const env = loadEnv();
  const cooldownSeconds = env.MANUAL_REFRESH_COOLDOWN_SECONDS;

  return getDb().$transaction(async (tx) => {
    const [feed] = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status
      FROM feeds
      WHERE id = ${feedId}::uuid
        AND workspace_id = ${workspaceId}::uuid
        AND deleted_at IS NULL
      FOR UPDATE
    `;

    const status = feed?.status.toUpperCase() as FeedStatus | undefined;
    if (!feed || status === FeedStatus.DELETED) {
      throw new SrotivaApiError(404, "FEED_NOT_FOUND", "Feed not found.");
    }
    if (status === FeedStatus.PAUSED) {
      throw new SrotivaApiError(409, "FEED_PAUSED", "Resume this feed before refreshing it.");
    }
    if (status !== FeedStatus.ACTIVE &&
        status !== FeedStatus.DEGRADED &&
        status !== FeedStatus.FAILED) {
      throw new SrotivaApiError(404, "FEED_NOT_FOUND", "Feed not found.");
    }

    const latestManual = await tx.feedRefreshJob.findFirst({
      where: { workspaceId, feedId, trigger: RefreshTrigger.MANUAL },
      select: { createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const elapsedSeconds = latestManual
      ? Math.floor((Date.now() - latestManual.createdAt.getTime()) / 1_000)
      : cooldownSeconds;
    const secondsRemaining = Math.max(0, cooldownSeconds - elapsedSeconds);

    if (secondsRemaining > 0) {
      throw new SrotivaApiError(
        429,
        "REFRESH_THROTTLED",
        `Try again in ${secondsRemaining} seconds.`,
        { secondsRemaining },
      );
    }

    const openJob = await tx.feedRefreshJob.findFirst({
      where: {
        workspaceId,
        feedId,
        status: { in: [RefreshJobStatus.QUEUED, RefreshJobStatus.RUNNING] },
      },
      select: { id: true },
    });
    if (openJob) {
      throw new SrotivaApiError(
        409,
        "REFRESH_ALREADY_QUEUED",
        "A refresh is already queued or running for this feed.",
        { jobId: openJob.id },
      );
    }

    await lockWorkspace(tx, workspaceId);
    await consumeManualRefreshQuota(
      tx,
      workspaceId,
      env.WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT,
    );

    const job = await tx.feedRefreshJob.create({
      data: {
        workspaceId,
        feedId,
        trigger: RefreshTrigger.MANUAL,
        status: RefreshJobStatus.QUEUED,
        priority: MANUAL_REFRESH_PRIORITY,
      },
      select: { id: true, status: true, trigger: true, createdAt: true },
    });
    await writeAuditLog({
      workspaceId,
      actorUserId,
      action: "feed.manual_refresh_requested",
      targetType: "feed",
      targetId: feedId,
      metadata: { jobId: job.id },
    }, tx);

    return {
      job,
      cooldownSeconds,
      cooldownUntil: new Date(job.createdAt.getTime() + cooldownSeconds * 1_000),
    };
  });
}
