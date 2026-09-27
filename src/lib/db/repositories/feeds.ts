import {
  FeedItemStatus,
  FeedSourceKind,
  FeedStatus,
  FeedVisibility,
  type Feed,
  type FeedItem,
  type FeedSourceType,
  type Prisma,
} from "@prisma/client";

import { getDb } from "../client.ts";

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
  failureCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FeedSelect;

export function listFeeds(workspaceId: string) {
  return getDb().feed.findMany({
    where: { workspaceId, deletedAt: null, status: { not: FeedStatus.DELETED } },
    select: feedProjection,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
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
    where: { outputSlug, status: FeedStatus.ACTIVE, deletedAt: null },
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
      feed: { status: FeedStatus.ACTIVE, deletedAt: null },
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
