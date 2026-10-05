import {
  FeedFilterScope,
  FeedFilterType,
  FeedItemStatus,
  FeedStatus,
  Prisma,
} from "@prisma/client";

import { SrotivaApiError } from "../api/errors.ts";
import { getDb } from "../db/client.ts";
import { applyFilters } from "./filter-engine.ts";

const FILTER_FIELDS = ["any", "title", "description", "url", "author"] as const;
const MAX_FILTERS_PER_FEED = 100;
const MAX_KEYWORDS = 50;
const PREVIEW_BATCH_SIZE = 200;
const previewItemProjection = {
  id: true,
  title: true,
  descriptionText: true,
  canonicalUrl: true,
  url: true,
  author: true,
  datePublished: true,
} satisfies Prisma.FeedItemSelect;
type PreviewItem = Prisma.FeedItemGetPayload<{ select: typeof previewItemProjection }>;

type FilterInput = {
  type: FeedFilterType;
  field: (typeof FILTER_FIELDS)[number];
  keywords: string[];
  isEnabled: boolean;
};

function validation(message: string): SrotivaApiError {
  return new SrotivaApiError(422, "VALIDATION_ERROR", message);
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validation("The request body must be an object.");
  }
  return value as Record<string, unknown>;
}

function assertKeys(body: Record<string, unknown>, allowed: readonly string[]): void {
  const unexpected = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw validation(`Unsupported fields: ${unexpected.join(", ")}.`);
}

function type(value: unknown): FeedFilterType {
  if (value === "whitelist") return FeedFilterType.WHITELIST;
  if (value === "blacklist") return FeedFilterType.BLACKLIST;
  throw validation("type must be whitelist or blacklist.");
}

function field(value: unknown): FilterInput["field"] {
  if (typeof value !== "string" || !FILTER_FIELDS.includes(value as FilterInput["field"])) {
    throw validation("field must be any, title, description, url, or author.");
  }
  return value as FilterInput["field"];
}

function keywords(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_KEYWORDS) {
    throw validation(`keywords must contain between 1 and ${MAX_KEYWORDS} entries.`);
  }
  const result: string[] = [];
  const seen = new Set<string>();
  for (const keyword of value) {
    if (typeof keyword !== "string" || !keyword.trim() || keyword.trim().length > 80) {
      throw validation("Each keyword must be a non-empty string of at most 80 characters.");
    }
    const trimmed = keyword.trim();
    const normalized = trimmed.normalize("NFKC").toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(trimmed);
    }
  }
  return result;
}

function enabled(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw validation("isEnabled must be a boolean.");
  return value;
}

export function parseFilterInput(value: unknown): { workspaceId: string; filter: FilterInput } {
  const body = object(value);
  assertKeys(body, ["workspaceId", "type", "field", "keywords", "isEnabled"]);
  if (typeof body.workspaceId !== "string") throw validation("workspaceId must be a UUID.");
  return {
    workspaceId: body.workspaceId,
    filter: {
      type: type(body.type),
      field: field(body.field),
      keywords: keywords(body.keywords),
      isEnabled: enabled(body.isEnabled, true),
    },
  };
}

export function parseFilterPatch(value: unknown): { workspaceId: string; patch: Partial<FilterInput> } {
  const body = object(value);
  assertKeys(body, ["workspaceId", "type", "field", "keywords", "isEnabled"]);
  if (typeof body.workspaceId !== "string") throw validation("workspaceId must be a UUID.");
  const patch: Partial<FilterInput> = {};
  if ("type" in body) patch.type = type(body.type);
  if ("field" in body) patch.field = field(body.field);
  if ("keywords" in body) patch.keywords = keywords(body.keywords);
  if ("isEnabled" in body) patch.isEnabled = enabled(body.isEnabled, true);
  if (!Object.keys(patch).length) throw validation("At least one filter field must be changed.");
  return { workspaceId: body.workspaceId, patch };
}

const projection = {
  id: true,
  feedId: true,
  type: true,
  field: true,
  value: true,
  isEnabled: true,
  orderIndex: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FeedFilterSelect;

type ProjectedFilter = Prisma.FeedFilterGetPayload<{ select: typeof projection }>;

function response(filter: ProjectedFilter) {
  const stored = filter.value && typeof filter.value === "object" && !Array.isArray(filter.value)
    ? (filter.value as { keywords?: unknown }).keywords
    : undefined;
  return {
    ...filter,
    type: filter.type === FeedFilterType.WHITELIST ? "whitelist" : "blacklist",
    keywords: Array.isArray(stored) ? stored : [],
    value: undefined,
  };
}

async function feedExists(workspaceId: string, feedId: string): Promise<boolean> {
  return Boolean(await getDb().feed.findFirst({
    where: { id: feedId, workspaceId, deletedAt: null, status: { not: FeedStatus.DELETED } },
    select: { id: true },
  }));
}

function notFound(message = "Feed not found."): SrotivaApiError {
  return new SrotivaApiError(404, "NOT_FOUND", message);
}

export async function listFilters(workspaceId: string, feedId: string) {
  if (!await feedExists(workspaceId, feedId)) throw notFound();
  const filters = await getDb().feedFilter.findMany({
    where: { workspaceId, feedId, scope: FeedFilterScope.FEED },
    select: projection,
    orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
  });
  return filters.map(response);
}

export async function createFilter(workspaceId: string, feedId: string, input: FilterInput) {
  const filter = await getDb().$transaction(async (tx) => {
    const [feed] = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM feeds
      WHERE id = ${feedId}::uuid AND workspace_id = ${workspaceId}::uuid
        AND deleted_at IS NULL AND status <> 'deleted'
      FOR UPDATE
    `;
    if (!feed) throw notFound();
    const existing = await tx.feedFilter.aggregate({
      where: { workspaceId, feedId, scope: FeedFilterScope.FEED },
      _count: true,
      _max: { orderIndex: true },
    });
    if (existing._count >= MAX_FILTERS_PER_FEED) {
      throw new SrotivaApiError(409, "LIMIT_EXCEEDED", `A feed can have at most ${MAX_FILTERS_PER_FEED} filters.`);
    }
    return tx.feedFilter.create({
      data: {
        workspaceId,
        feedId,
        scope: FeedFilterScope.FEED,
        type: input.type,
        field: input.field,
        operator: "contains",
        value: { keywords: input.keywords },
        isEnabled: input.isEnabled,
        orderIndex: (existing._max.orderIndex ?? -1) + 1,
      },
      select: projection,
    });
  });
  return response(filter);
}

export async function updateFilter(
  workspaceId: string,
  feedId: string,
  filterId: string,
  patch: Partial<FilterInput>,
) {
  if (!await feedExists(workspaceId, feedId)) throw notFound();
  const result = await getDb().feedFilter.updateMany({
    where: { id: filterId, workspaceId, feedId, scope: FeedFilterScope.FEED },
    data: {
      ...(patch.type === undefined ? {} : { type: patch.type }),
      ...(patch.field === undefined ? {} : { field: patch.field }),
      ...(patch.keywords === undefined ? {} : { value: { keywords: patch.keywords } }),
      ...(patch.isEnabled === undefined ? {} : { isEnabled: patch.isEnabled }),
    },
  });
  if (!result.count) throw notFound("Filter not found.");
  return response(await getDb().feedFilter.findFirstOrThrow({
    where: { id: filterId, workspaceId, feedId, scope: FeedFilterScope.FEED },
    select: projection,
  }));
}

export async function deleteFilter(workspaceId: string, feedId: string, filterId: string) {
  if (!await feedExists(workspaceId, feedId)) throw notFound();
  const result = await getDb().feedFilter.deleteMany({
    where: { id: filterId, workspaceId, feedId, scope: FeedFilterScope.FEED },
  });
  if (!result.count) throw notFound("Filter not found.");
  return { deleted: true as const, id: filterId };
}

export async function previewFilter(workspaceId: string, feedId: string, candidate: FilterInput) {
  if (!await feedExists(workspaceId, feedId)) throw notFound();
  const stored = await getDb().feedFilter.findMany({
    where: { workspaceId, feedId, scope: FeedFilterScope.FEED, isEnabled: true },
    select: { id: true, type: true, field: true, value: true, isEnabled: true },
    orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
  });
  const filters = [
    ...stored,
    {
      id: "preview",
      type: candidate.type,
      field: candidate.field,
      value: { keywords: candidate.keywords },
      isEnabled: candidate.isEnabled,
    },
  ];
  const includedItems: PreviewItem[] = [];
  const excludedItems: Array<PreviewItem & { reason: NonNullable<ReturnType<typeof applyFilters>["reason"]> }> = [];
  let includedCount = 0;
  let excludedCount = 0;
  let cursor: string | undefined;
  for (;;) {
    // Stable UUID order keeps pagination simple; preview samples do not promise newest-first ordering.
    const items = await getDb().feedItem.findMany({
      where: { workspaceId, feedId, status: { in: [FeedItemStatus.ACTIVE, FeedItemStatus.FILTERED] } },
      select: previewItemProjection,
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: PREVIEW_BATCH_SIZE,
    });
    for (const item of items) {
      const result = applyFilters({ item, filters });
      if (result.included) {
        includedCount += 1;
        if (includedItems.length < 10) includedItems.push(item);
      } else {
        excludedCount += 1;
        if (excludedItems.length < 10) excludedItems.push({ ...item, reason: result.reason });
      }
    }
    if (items.length < PREVIEW_BATCH_SIZE) break;
    cursor = items.at(-1)!.id;
  }
  return {
    includedCount,
    excludedCount,
    includedItems,
    excludedItems,
  };
}
