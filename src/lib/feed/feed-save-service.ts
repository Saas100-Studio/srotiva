import { FeedSourceKind, FeedSourceType, FeedStatus, FeedVisibility, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { MorselApiError } from "../api/errors.ts";
import { loadEnv } from "../config/env.ts";
import { normalizeUserUrl } from "../crawler/url-safety.ts";
import { getDb } from "../db/client.ts";
import { createPrivateFeedToken, hashPrivateFeedToken } from "./feed-output-token.ts";
import { createItemFingerprint } from "./fingerprint.ts";

type JsonObject = Record<string, Prisma.JsonValue>;
type SaveItem = {
  sourceItemId: string | null; canonicalUrl: string | null; url: string | null;
  title: string | null; descriptionText: string | null; descriptionHtml: string | null;
  author: string | null; imageUrl: string | null; datePublished: Date | null;
  dateModified: Date | null; raw: JsonObject;
};
export type SaveFeedInput = {
  workspaceId: string; sourceUrl: string; sourceType: FeedSourceType;
  sourceKind: FeedSourceKind; feedTitle: string; feedDescription: string | null;
  previewItems: SaveItem[];
};

function invalid(message: string, details: Record<string, unknown> = {}): never {
  throw new MorselApiError(422, "VALIDATION_ERROR", message, details);
}
function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${field} must be an object.`, { field });
  return value as Record<string, unknown>;
}
function string(value: unknown, field: string, options: { nullable?: boolean; max?: number } = {}): string | null {
  if (value === null && options.nullable) return null;
  if (typeof value !== "string") invalid(`${field} must be a string.`, { field });
  const result = value.trim();
  if (!result && !options.nullable) invalid(`${field} is required.`, { field });
  if (result.length > (options.max ?? 20_000)) invalid(`${field} is too long.`, { field });
  return result || null;
}
function url(value: unknown, field: string, nullable = true): string | null {
  const candidate = string(value, field, { nullable, max: 8_192 });
  if (!candidate) return null;
  try { return normalizeUserUrl(candidate).href; } catch { invalid(`${field} must be a safe HTTP or HTTPS URL.`, { field }); }
}
function date(value: unknown, field: string): Date | null {
  if (value === null) return null;
  if (typeof value !== "string") invalid(`${field} must be an ISO date string or null.`, { field });
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) invalid(`${field} must be a valid date.`, { field });
  return result;
}
function rawJson(value: unknown, field: string): JsonObject {
  const result = object(value, field) as JsonObject;
  if (JSON.stringify(result).length > 100_000) invalid(`${field} is too large.`, { field });
  return result;
}
function item(value: unknown, index: number): SaveItem {
  const field = `previewItems[${index}]`;
  const input = object(value, field);
  const allowed = new Set(["sourceItemId", "fingerprint", "canonicalUrl", "url", "title", "descriptionText", "descriptionHtml", "author", "imageUrl", "datePublished", "dateModified", "raw"]);
  const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
  if (unexpected.length) invalid(`${field} contains unsupported fields.`, { field, unexpected });
  const result = {
    sourceItemId: string(input.sourceItemId ?? null, `${field}.sourceItemId`, { nullable: true, max: 8_192 }),
    canonicalUrl: url(input.canonicalUrl ?? null, `${field}.canonicalUrl`),
    url: url(input.url ?? null, `${field}.url`),
    title: string(input.title ?? null, `${field}.title`, { nullable: true, max: 10_000 }),
    descriptionText: string(input.descriptionText ?? null, `${field}.descriptionText`, { nullable: true }),
    descriptionHtml: string(input.descriptionHtml ?? null, `${field}.descriptionHtml`, { nullable: true, max: 100_000 }),
    author: string(input.author ?? null, `${field}.author`, { nullable: true, max: 2_000 }),
    imageUrl: url(input.imageUrl ?? null, `${field}.imageUrl`),
    datePublished: date(input.datePublished ?? null, `${field}.datePublished`),
    dateModified: date(input.dateModified ?? null, `${field}.dateModified`),
    raw: rawJson(input.raw ?? {}, `${field}.raw`),
  };
  if (!result.canonicalUrl && !result.sourceItemId && !result.title) {
    invalid(`${field} must include a canonical URL, source item ID, or title.`, { field });
  }
  return result;
}

export function parseSaveFeedInput(value: unknown): SaveFeedInput {
  const input = object(value, "body");
  const allowed = new Set(["workspaceId", "sourceUrl", "sourceType", "sourceFormat", "feedTitle", "feedDescription", "previewItems", "warnings"]);
  const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
  if (unexpected.length) invalid("The request contains unsupported fields.", { unexpected });
  if (input.warnings !== undefined && (!Array.isArray(input.warnings) || input.warnings.length > 100 || input.warnings.some((warning) => typeof warning !== "string" || warning.length > 500))) {
    invalid("warnings must be an array of short strings.", { field: "warnings" });
  }
  const workspaceId = string(input.workspaceId, "workspaceId", { max: 100 })!;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) invalid("workspaceId must be a UUID.", { field: "workspaceId" });
  const sourceUrl = url(input.sourceUrl, "sourceUrl", false)!;
  if (input.sourceType !== "native" && input.sourceType !== "webpage") invalid("sourceType must be native or webpage.", { field: "sourceType" });
  const sourceFormat = input.sourceFormat;
  const sourceKind = sourceFormat === undefined || sourceFormat === "html"
    ? FeedSourceKind.URL
    : sourceFormat === "rss"
      ? FeedSourceKind.RSS
      : sourceFormat === "atom"
        ? FeedSourceKind.ATOM
        : invalid("sourceFormat must be rss, atom, or html.", { field: "sourceFormat" });
  if (
    sourceFormat !== undefined &&
    ((input.sourceType === "webpage") !== (sourceFormat === "html"))
  ) invalid("sourceType and sourceFormat do not match.", { field: "sourceFormat" });
  if (!Array.isArray(input.previewItems) || input.previewItems.length > 10) invalid("previewItems must be an array of at most 10 items.", { field: "previewItems" });
  return {
    workspaceId, sourceUrl,
    sourceType: input.sourceType === "native" ? FeedSourceType.NATIVE : FeedSourceType.WEBPAGE,
    sourceKind,
    feedTitle: string(input.feedTitle, "feedTitle", { max: 500 })!,
    feedDescription: string(input.feedDescription ?? null, "feedDescription", { nullable: true }),
    previewItems: input.previewItems.map(item),
  };
}

function slugBase(title: string, sourceUrl: string): string {
  return title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || new URL(sourceUrl).hostname.replace(/[^a-z0-9]+/g, "-");
}

export async function saveFeed(input: SaveFeedInput, createdByUserId: string) {
  const slug = `${slugBase(input.feedTitle, input.sourceUrl)}-${randomUUID()}`;
  const feedId = randomUUID();
  const outputSlug = randomUUID();
  const privateToken = createPrivateFeedToken(feedId);
  const publicTokenHash = hashPrivateFeedToken(privateToken);
  const outputUrl = `${loadEnv().APP_URL}/f/${outputSlug}`;
  const uniqueItems = new Map<string, SaveItem>();
  for (const previewItem of input.previewItems) {
    const fingerprint = createItemFingerprint({ feedUrl: input.sourceUrl, canonicalUrl: previewItem.canonicalUrl, sourceItemId: previewItem.sourceItemId, title: previewItem.title, datePublished: previewItem.datePublished });
    uniqueItems.set(fingerprint, previewItem);
  }
  return getDb().$transaction(async (tx) => {
    const feed = await tx.feed.create({
      data: {
        id: feedId, workspaceId: input.workspaceId, createdByUserId, name: input.feedTitle, slug, outputSlug, publicTokenHash,
        description: input.feedDescription, status: FeedStatus.ACTIVE,
        visibility: FeedVisibility.PRIVATE, sourceType: input.sourceType,
        sourceUrl: input.sourceUrl, refreshIntervalMinutes: 1440,
        publicRssUrl: `${outputUrl}/rss`, publicJsonUrl: `${outputUrl}/json`, publicCsvUrl: `${outputUrl}/csv`,
        sources: { create: { kind: input.sourceKind, url: input.sourceUrl } },
      },
    });
    if (uniqueItems.size) await tx.feedItem.createMany({
      data: [...uniqueItems].map(([fingerprint, previewItem]) => ({
        workspaceId: input.workspaceId, feedId: feed.id, fingerprint, ...previewItem,
        raw: previewItem.raw as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
    return { feed, privateToken, outputBaseUrl: outputUrl };
  });
}
