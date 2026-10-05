import {
  ErrorSeverity,
  FeedFilterScope,
  FeedFilterType,
  FeedItemStatus,
  FeedSourceKind,
  FeedStatus,
  FeedVisibility,
  Prisma,
  type Feed,
  type FeedItem,
  type FeedSourceType,
} from "@prisma/client";
import { isDeepStrictEqual } from "node:util";

import { getDb } from "../client.ts";
import { nextFailedRefreshAt, nextSuccessfulRefreshAt } from "../../feed/refresh-schedule.ts";
import { applyFilters } from "../../feed/filter-engine.ts";
import { loadEnv } from "../../config/env.ts";
import { assertItemCapacity, lockWorkspace } from "../../usage/workspace-quotas.ts";

const feedProjection = {
  id: true,
  workspaceId: true,
  name: true,
  slug: true,
  outputSlug: true,
  description: true,
  status: true,
  visibility: true,
  sourceType: true,
  sourceUrl: true,
  publicRssUrl: true,
  publicJsonUrl: true,
  publicCsvUrl: true,
  refreshIntervalMinutes: true,
  lastRefreshedAt: true,
  nextRefreshAt: true,
  lastSuccessAt: true,
  lastFailureAt: true,
  failureCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FeedSelect;

export function listFeeds(workspaceId: string) {
  return getDb().feed.findMany({
    where: { workspaceId, deletedAt: null, status: { not: FeedStatus.DELETED } },
    select: feedProjection,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });
}

export const DASHBOARD_FEED_PAGE_SIZE = 20;

export async function listDashboardFeeds(
  workspaceId: string,
  { page, query }: { page: number; query: string },
) {
  const normalizedQuery = query.trim().slice(0, 100);
  const normalizedPage = Math.min(Math.max(Math.trunc(page) || 1, 1), 10_000);
  const where = {
    workspaceId,
    deletedAt: null,
    status: { not: FeedStatus.DELETED },
    ...(normalizedQuery
      ? {
          OR: [
            { name: { contains: normalizedQuery, mode: Prisma.QueryMode.insensitive } },
            { sourceUrl: { contains: normalizedQuery, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  } satisfies Prisma.FeedWhereInput;
  const rows = await getDb().feed.findMany({
    where,
    select: feedProjection,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (normalizedPage - 1) * DASHBOARD_FEED_PAGE_SIZE,
    take: DASHBOARD_FEED_PAGE_SIZE + 1,
  });

  return {
    feeds: rows.slice(0, DASHBOARD_FEED_PAGE_SIZE),
    page: normalizedPage,
    query: normalizedQuery,
    hasPreviousPage: normalizedPage > 1,
    hasNextPage: rows.length > DASHBOARD_FEED_PAGE_SIZE,
  };
}

export function findFeedDetail(workspaceId: string, feedId: string) {
  return getDb().feed.findFirst({
    where: {
      id: feedId,
      workspaceId,
      deletedAt: null,
      status: { not: FeedStatus.DELETED },
    },
    select: {
      ...feedProjection,
      sources: {
        select: {
          id: true,
          kind: true,
          url: true,
          etag: true,
          lastModified: true,
          lastHttpStatus: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { items: true } },
    },
  });
}

export function findActiveFeedByOutputSlug(outputSlug: string) {
  return getDb().feed.findFirst({
    where: {
      outputSlug,
      status: { in: [FeedStatus.ACTIVE, FeedStatus.DEGRADED, FeedStatus.FAILED] },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      sourceUrl: true,
      outputSlug: true,
      visibility: true,
      publicTokenHash: true,
      settings: true,
    },
  });
}

export function listActiveOutputItems(feedId: string, limit: number) {
  return getDb().feedItem.findMany({
    where: {
      feedId,
      status: FeedItemStatus.ACTIVE,
      feed: {
        status: { in: [FeedStatus.ACTIVE, FeedStatus.DEGRADED, FeedStatus.FAILED] },
        deletedAt: null,
      },
    },
    select: {
      sourceItemId: true,
      fingerprint: true,
      canonicalUrl: true,
      url: true,
      title: true,
      descriptionText: true,
      descriptionHtml: true,
      author: true,
      imageUrl: true,
      datePublished: true,
      dateModified: true,
    },
    orderBy: [
      { datePublished: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit,
  });
}

export function initializePrivateFeedToken(workspaceId: string, feedId: string, publicTokenHash: string) {
  return getDb().feed.updateMany({
    where: { id: feedId, workspaceId, visibility: FeedVisibility.PRIVATE, publicTokenHash: null },
    data: { publicTokenHash },
  });
}

export async function privateFeedTokenHashMatches(
  workspaceId: string,
  feedId: string,
  publicTokenHash: string,
): Promise<boolean> {
  return await getDb().feed.count({
    where: {
      id: feedId,
      workspaceId,
      visibility: FeedVisibility.PRIVATE,
      deletedAt: null,
      status: { not: FeedStatus.DELETED },
      publicTokenHash,
    },
  }) === 1;
}

export async function rotatePrivateFeedTokenHash(
  workspaceId: string,
  feedId: string,
  publicTokenHash: string,
): Promise<boolean> {
  const result = await getDb().feed.updateMany({
    where: {
      id: feedId,
      workspaceId,
      visibility: FeedVisibility.PRIVATE,
      deletedAt: null,
      status: { not: FeedStatus.DELETED },
    },
    data: { publicTokenHash },
  });
  return result.count === 1;
}

export type FeedPatch = {
  name?: string;
  description?: string | null;
  status?: FeedStatus;
  visibility?: FeedVisibility;
};

export async function updateFeed(
  workspaceId: string,
  feedId: string,
  data: FeedPatch,
) {
  const result = await getDb().feed.updateMany({
    where: {
      id: feedId,
      workspaceId,
      deletedAt: null,
      status: { not: FeedStatus.DELETED },
    },
    data,
  });
  return result.count ? findFeedDetail(workspaceId, feedId) : null;
}

export async function softDeleteFeed(workspaceId: string, feedId: string) {
  const result = await getDb().feed.updateMany({
    where: {
      id: feedId,
      workspaceId,
      deletedAt: null,
      status: { not: FeedStatus.DELETED },
    },
    data: { status: FeedStatus.DELETED, deletedAt: new Date() },
  });
  return result.count > 0;
}

export async function listFeedItems(
  workspaceId: string,
  feedId: string,
  limit: number,
  cursor?: string,
) {
  if (cursor) {
    const validCursor = await getDb().feedItem.findFirst({
      where: { id: cursor, workspaceId, feedId },
      select: { id: true },
    });
    if (!validCursor) return null;
  }
  const items = await getDb().feedItem.findMany({
    where: {
      workspaceId,
      feedId,
      feed: { deletedAt: null, status: { not: FeedStatus.DELETED } },
    },
    select: {
      id: true,
      fingerprint: true,
      sourceItemId: true,
      canonicalUrl: true,
      url: true,
      title: true,
      descriptionText: true,
      descriptionHtml: true,
      author: true,
      imageUrl: true,
      datePublished: true,
      dateModified: true,
      status: true,
      firstSeenAt: true,
      lastSeenAt: true,
    },
    orderBy: [
      { datePublished: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
  });
  return {
    items: items.slice(0, limit),
    nextCursor: items.length > limit ? items[limit - 1]?.id ?? null : null,
  };
}

export type CreateFeedInput = {
  workspaceId: string;
  createdByUserId: string;
  name: string;
  slug: string;
  sourceType: FeedSourceType;
  sourceUrl: string;
  refreshIntervalMinutes: number;
};

export function createFeed({
  workspaceId,
  createdByUserId,
  name,
  slug,
  sourceType,
  sourceUrl,
  refreshIntervalMinutes,
}: CreateFeedInput): Promise<Feed> {
  return getDb().feed.create({
    data: {
      workspaceId,
      createdByUserId,
      name,
      slug,
      sourceType,
      sourceUrl,
      refreshIntervalMinutes,
      sources: {
        create: {
          kind: FeedSourceKind.URL,
          url: sourceUrl,
        },
      },
    },
  });
}

export type FeedItemInput = {
  fingerprint: string;
  sourceItemId?: string | null;
  canonicalUrl?: string | null;
  url?: string | null;
  title?: string | null;
  descriptionText?: string | null;
  descriptionHtml?: string | null;
  author?: string | null;
  authors?: Prisma.InputJsonValue;
  imageUrl?: string | null;
  imageProxyUrl?: string | null;
  datePublished?: Date | null;
  dateModified?: Date | null;
  raw?: Prisma.InputJsonValue;
  status?: FeedItemStatus;
  filterReason?: Prisma.InputJsonValue;
  isPinned?: boolean;
};

export type UpsertFeedItemInput = {
  workspaceId: string;
  feedId: string;
  item: FeedItemInput;
};

export function upsertFeedItem({
  workspaceId,
  feedId,
  item,
}: UpsertFeedItemInput): Promise<FeedItem> {
  const now = new Date();
  const mutableData = {
    sourceItemId: item.sourceItemId,
    canonicalUrl: item.canonicalUrl,
    url: item.url,
    title: item.title,
    descriptionText: item.descriptionText,
    descriptionHtml: item.descriptionHtml,
    author: item.author,
    authors: item.authors,
    imageUrl: item.imageUrl,
    imageProxyUrl: item.imageProxyUrl,
    datePublished: item.datePublished,
    dateModified: item.dateModified,
    raw: item.raw,
    status: item.status,
    filterReason: item.filterReason,
    isPinned: item.isPinned,
  } satisfies Prisma.FeedItemUpdateInput;

  return getDb().feedItem.upsert({
    where: {
      feedId_fingerprint: { feedId, fingerprint: item.fingerprint },
      workspaceId,
    },
    create: {
      workspaceId,
      feedId,
      fingerprint: item.fingerprint,
      ...mutableData,
      status: item.status ?? FeedItemStatus.ACTIVE,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {
      ...mutableData,
      lastSeenAt: now,
    },
  });
}

export type RefreshItemInput = {
  sourceItemId: string | null;
  fingerprint: string;
  canonicalUrl: string | null;
  url: string | null;
  title: string | null;
  descriptionText: string | null;
  descriptionHtml: string | null;
  author: string | null;
  imageUrl: string | null;
  datePublished: Date | null;
  dateModified: Date | null;
  raw: Record<string, unknown>;
};

type PersistedRefreshItem = RefreshItemInput & {
  status: FeedItemStatus;
  filterReason: Prisma.JsonValue | null;
};

const refreshItemFields = [
  "sourceItemId", "canonicalUrl", "url", "title", "descriptionText",
  "descriptionHtml", "author", "imageUrl", "datePublished", "dateModified", "raw",
  "status", "filterReason",
] as const;

function refreshItemChanged(
  stored: Record<(typeof refreshItemFields)[number], unknown>,
  incoming: PersistedRefreshItem,
): boolean {
  return refreshItemFields.some((field) => !isDeepStrictEqual(stored[field], incoming[field]));
}

export function findFeedForRefresh(feedId: string) {
  return getDb().feed.findFirst({
    where: { id: feedId, deletedAt: null, status: { not: FeedStatus.DELETED } },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      sourceType: true,
      sourceUrl: true,
      sources: {
        select: { id: true, url: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
}

export async function recordRefreshSuccess(input: {
  feedId: string;
  sourceId: string | null;
  items: RefreshItemInput[];
  warnings: string[];
  httpStatus: number;
  fetchDurationMs: number;
  etag: string | null;
  lastModified: string | null;
}) {
  return getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM feeds WHERE id = ${input.feedId}::uuid FOR UPDATE`;
    const feed = await tx.feed.findFirst({
      where: {
        id: input.feedId,
        deletedAt: null,
        status: { in: [FeedStatus.ACTIVE, FeedStatus.DEGRADED, FeedStatus.FAILED] },
      },
      select: { workspaceId: true, refreshIntervalMinutes: true },
    });
    if (!feed) throw new Error(`Feed ${input.feedId} is no longer refreshable`);
    const filters = await tx.feedFilter.findMany({
      where: {
        workspaceId: feed.workspaceId,
        feedId: input.feedId,
        scope: FeedFilterScope.FEED,
        isEnabled: true,
        type: { in: [FeedFilterType.WHITELIST, FeedFilterType.BLACKLIST] },
      },
      select: { id: true, type: true, field: true, value: true, isEnabled: true },
      orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
    });
    const evaluatedItems = input.items.map((item): PersistedRefreshItem => {
      const result = applyFilters({ item, filters });
      return {
        ...item,
        status: result.included ? FeedItemStatus.ACTIVE : FeedItemStatus.FILTERED,
        filterReason: result.reason,
      };
    });
    const existing = await tx.feedItem.findMany({
      where: { feedId: input.feedId, fingerprint: { in: evaluatedItems.map((item) => item.fingerprint) } },
      select: {
        fingerprint: true,
        sourceItemId: true,
        canonicalUrl: true,
        url: true,
        title: true,
        descriptionText: true,
        descriptionHtml: true,
        author: true,
        imageUrl: true,
        datePublished: true,
        dateModified: true,
        raw: true,
        status: true,
        filterReason: true,
      },
    });
    const byFingerprint = new Map(existing.map((item) => [item.fingerprint, item]));
    const items = evaluatedItems.map((item) => {
      const stored = byFingerprint.get(item.fingerprint);
      return stored?.status === FeedItemStatus.HIDDEN || stored?.status === FeedItemStatus.DELETED
        ? { ...item, status: stored.status, filterReason: stored.filterReason }
        : item;
    });
    const newItems = items.filter((item) => !byFingerprint.has(item.fingerprint));
    const changedItems = items.filter((item) => {
      const stored = byFingerprint.get(item.fingerprint);
      return stored ? refreshItemChanged(stored, item) : false;
    });
    const changedFingerprints = new Set(changedItems.map((item) => item.fingerprint));
    const now = new Date();

    if (newItems.length) {
      await lockWorkspace(tx, feed.workspaceId);
      await assertItemCapacity(
        tx,
        feed.workspaceId,
        newItems.length,
        loadEnv().WORKSPACE_ITEM_LIMIT,
      );
      await tx.feedItem.createMany({
        data: newItems.map((item) => ({
          ...item,
          raw: item.raw as Prisma.InputJsonValue,
          filterReason: item.filterReason === null ? Prisma.DbNull : item.filterReason,
          workspaceId: feed.workspaceId,
          feedId: input.feedId,
          firstSeenAt: now,
          lastSeenAt: now,
        })),
      });
    }

    await Promise.all(changedItems.map((item) => tx.feedItem.update({
      where: { feedId_fingerprint: { feedId: input.feedId, fingerprint: item.fingerprint } },
      data: {
        ...item,
        raw: item.raw as Prisma.InputJsonValue,
        filterReason: item.filterReason === null ? Prisma.DbNull : item.filterReason,
        lastSeenAt: now,
      },
    })));
    const unchangedFingerprints = items
      .filter((item) => byFingerprint.has(item.fingerprint) && !changedFingerprints.has(item.fingerprint))
      .map((item) => item.fingerprint);
    if (unchangedFingerprints.length) {
      await tx.feedItem.updateMany({
        where: { feedId: input.feedId, fingerprint: { in: unchangedFingerprints } },
        data: { lastSeenAt: now },
      });
    }

    await tx.feed.update({
      where: { id: input.feedId },
      data: {
        status: input.warnings.length ? FeedStatus.DEGRADED : FeedStatus.ACTIVE,
        lastRefreshedAt: now,
        lastSuccessAt: now,
        nextRefreshAt: nextSuccessfulRefreshAt(now, feed.refreshIntervalMinutes),
        failureCount: 0,
      },
    });
    if (input.sourceId) {
      await tx.feedSource.update({
        where: { id: input.sourceId },
        data: {
          robotsStatus: "allowed",
          lastHttpStatus: input.httpStatus,
          lastFetchDurationMs: Math.round(input.fetchDurationMs),
          etag: input.etag,
          lastModified: input.lastModified,
        },
      });
    }

    return {
      itemsFound: items.length,
      itemsNew: newItems.length,
      itemsChanged: changedItems.length,
    };
  });
}

export async function recordRefreshFailure(input: {
  feedId: string;
  jobId?: string;
  trigger: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  source?: {
    httpStatus: number | null;
    fetchDurationMs: number | null;
    etag: string | null;
    lastModified: string | null;
  };
}) {
  return getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM feeds WHERE id = ${input.feedId}::uuid FOR UPDATE`;
    const now = new Date();
    const feed = await tx.feed.findUnique({
      where: { id: input.feedId },
      select: {
        workspaceId: true,
        status: true,
        refreshIntervalMinutes: true,
        failureCount: true,
        sources: { select: { id: true }, take: 1 },
      },
    });
    if (!feed) return;
    const refreshable = feed.status === FeedStatus.ACTIVE ||
      feed.status === FeedStatus.DEGRADED || feed.status === FeedStatus.FAILED;
    if (refreshable) {
      await tx.feed.updateMany({
        where: {
          id: input.feedId,
          status: { in: [FeedStatus.ACTIVE, FeedStatus.DEGRADED, FeedStatus.FAILED] },
        },
        data: {
          status: FeedStatus.FAILED,
          lastRefreshedAt: now,
          lastFailureAt: now,
          nextRefreshAt: nextFailedRefreshAt(now, feed.refreshIntervalMinutes, feed.failureCount + 1),
          failureCount: { increment: 1 },
        },
      });
    }
    if (refreshable && feed.sources[0]) {
      await tx.feedSource.update({
        where: { id: feed.sources[0].id },
        data: input.source
          ? {
              lastHttpStatus: input.source.httpStatus,
              lastFetchDurationMs: input.source.fetchDurationMs,
              etag: input.source.etag,
              lastModified: input.source.lastModified,
            }
          : { lastHttpStatus: typeof input.details?.status === "number" ? input.details.status : null },
      });
    }
    await tx.errorLog.create({
      data: {
        workspaceId: feed.workspaceId,
        feedId: input.feedId,
        jobId: input.jobId,
        severity: ErrorSeverity.ERROR,
        source: "refresh_worker",
        code: input.code,
        message: input.message,
        details: { trigger: input.trigger, ...(input.details ?? {}) } as Prisma.InputJsonValue,
      },
    });
  });
}
