import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "@prisma/client";

import {
  assertFeedCapacity,
  assertItemCapacity,
  consumeManualRefreshQuota,
} from "../lib/usage/workspace-quotas.ts";

function transaction(value: {
  feedCount?: number;
  itemCount?: number;
  refreshUsed?: number | null;
  onUpsert?: (input: unknown) => void;
}): Prisma.TransactionClient {
  return {
    feed: { count: async () => value.feedCount ?? 0 },
    feedItem: { count: async () => value.itemCount ?? 0 },
    usageLimit: {
      findUnique: async () => value.refreshUsed === null || value.refreshUsed === undefined
        ? null
        : { used: value.refreshUsed },
      upsert: async (input: unknown) => {
        value.onUpsert?.(input);
        return {};
      },
    },
  } as unknown as Prisma.TransactionClient;
}

test("feed and retained-item capacity reject additions above workspace limits", async () => {
  await assert.doesNotReject(assertFeedCapacity(transaction({ feedCount: 24 }), crypto.randomUUID(), 25));
  await assert.rejects(
    assertFeedCapacity(transaction({ feedCount: 25 }), crypto.randomUUID(), 25),
    (error: unknown) => error instanceof Error && /feed limit/u.test(error.message),
  );
  await assert.doesNotReject(assertItemCapacity(transaction({ itemCount: 9_998 }), crypto.randomUUID(), 2, 10_000));
  await assert.rejects(
    assertItemCapacity(transaction({ itemCount: 9_999 }), crypto.randomUUID(), 2, 10_000),
    (error: unknown) => error instanceof Error && /retained item limit/u.test(error.message),
  );
});

test("monthly manual-refresh quota uses UTC calendar boundaries and increments atomically under the workspace lock", async () => {
  let upsert: unknown;
  const workspaceId = crypto.randomUUID();
  await consumeManualRefreshQuota(
    transaction({ refreshUsed: 9, onUpsert: (input) => { upsert = input; } }),
    workspaceId,
    10,
    new Date("2026-10-31T23:59:59.000Z"),
  );
  assert.deepEqual(upsert, {
    where: {
      workspaceId_periodStart_periodEnd_metric: {
        workspaceId,
        periodStart: new Date("2026-10-01T00:00:00.000Z"),
        periodEnd: new Date("2026-11-01T00:00:00.000Z"),
        metric: "manual_refreshes",
      },
    },
    create: {
      workspaceId,
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      periodEnd: new Date("2026-11-01T00:00:00.000Z"),
      metric: "manual_refreshes",
      used: 1,
      limit: 10,
    },
    update: { used: { increment: 1 }, limit: 10 },
  });

  await assert.rejects(
    consumeManualRefreshQuota(transaction({ refreshUsed: 10 }), workspaceId, 10),
    (error: unknown) => error instanceof Error && /monthly manual refresh limit/u.test(error.message),
  );
});
