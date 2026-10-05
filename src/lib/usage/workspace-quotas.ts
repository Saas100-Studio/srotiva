import type { Prisma } from "@prisma/client";

import { SrotivaApiError } from "../api/errors.ts";

const MANUAL_REFRESH_METRIC = "manual_refreshes";

function quotaExceeded(
  metric: string,
  limit: number,
  used: number,
): SrotivaApiError {
  return new SrotivaApiError(
    429,
    "QUOTA_EXCEEDED",
    `This workspace has reached its ${metric} limit.`,
    { metric, limit, used },
  );
}

export async function lockWorkspace(
  tx: Prisma.TransactionClient,
  workspaceId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
}

export async function assertFeedCapacity(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  limit: number,
): Promise<void> {
  const used = await tx.feed.count({
    where: { workspaceId, deletedAt: null },
  });
  if (used >= limit) throw quotaExceeded("feed", limit, used);
}

export async function assertItemCapacity(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  additionalItems: number,
  limit: number,
): Promise<void> {
  if (additionalItems <= 0) return;
  const used = await tx.feedItem.count({ where: { workspaceId } });
  if (used + additionalItems > limit) {
    throw quotaExceeded("retained item", limit, used);
  }
}

function utcMonth(now: Date): { periodStart: Date; periodEnd: Date } {
  return {
    periodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export async function consumeManualRefreshQuota(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  limit: number,
  now = new Date(),
): Promise<void> {
  const { periodStart, periodEnd } = utcMonth(now);
  const where = {
    workspaceId_periodStart_periodEnd_metric: {
      workspaceId,
      periodStart,
      periodEnd,
      metric: MANUAL_REFRESH_METRIC,
    },
  } as const;
  const current = await tx.usageLimit.findUnique({
    where,
    select: { used: true },
  });
  const used = current?.used ?? 0;
  if (used >= limit) throw quotaExceeded("monthly manual refresh", limit, used);

  await tx.usageLimit.upsert({
    where,
    create: {
      workspaceId,
      periodStart,
      periodEnd,
      metric: MANUAL_REFRESH_METRIC,
      used: 1,
      limit,
    },
    update: { used: { increment: 1 }, limit },
  });
}
