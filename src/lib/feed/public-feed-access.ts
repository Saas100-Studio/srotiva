import { FeedVisibility, type Prisma } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";

import { loadEnv } from "../config/env.ts";
import { findActiveFeedByOutputSlug, listActiveOutputItems } from "../db/repositories/feeds.ts";
import { hashPrivateFeedToken } from "./feed-output-token.ts";
import { getRenderCacheControl } from "./render-cache.ts";
import { renderCsvFeed } from "./render-csv.ts";
import { renderJsonFeed } from "./render-json.ts";
import { renderRssFeed } from "./render-rss.ts";

type OutputFormat = "rss" | "json" | "csv";

function postLimit(settings: Prisma.JsonValue): number {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return 50;
  const value = (settings as Record<string, unknown>).postLimit;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? Math.min(value, 500) : 50;
}

function validToken(token: string | null, storedHash: string | null): boolean {
  const candidate = Buffer.from(hashPrivateFeedToken(token ?? ""), "hex");
  const hasValidHash = /^[\da-f]{64}$/iu.test(storedHash ?? "");
  const expected = Buffer.from(hasValidHash ? storedHash! : "0".repeat(64), "hex");
  return timingSafeEqual(candidate, expected) && token !== null && hasValidHash;
}

async function findPublicFeed(outputSlug: string, token: string | null) {
  const feed = await findActiveFeedByOutputSlug(outputSlug);
  if (!feed || (feed.visibility === FeedVisibility.PRIVATE && !validToken(token, feed.publicTokenHash))) return null;
  const items = await listActiveOutputItems(feed.id, postLimit(feed.settings));
  return {
    feed: { feedTitle: feed.name, feedDescription: feed.description, siteUrl: feed.sourceUrl },
    items: items.map((item) => ({ ...item, raw: {} })),
    access: feed.visibility === FeedVisibility.PRIVATE ? "private" as const : "public" as const,
    selfBaseUrl: `${loadEnv().APP_URL}/f/${feed.outputSlug}`,
  };
}

function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": getRenderCacheControl("private") },
  });
}

export async function renderPublicFeed(request: Request, outputSlug: string, format: OutputFormat): Promise<Response> {
  const result = await findPublicFeed(outputSlug, new URL(request.url).searchParams.get("token"));
  if (!result) return notFound();
  const body = format === "rss"
    ? renderRssFeed({ feed: result.feed, items: result.items, selfUrl: `${result.selfBaseUrl}/rss` })
    : format === "json"
      ? renderJsonFeed({ feed: result.feed, items: result.items })
      : renderCsvFeed({ items: result.items });
  const contentType = format === "rss"
    ? "application/rss+xml; charset=utf-8"
    : format === "json"
      ? "application/json; charset=utf-8"
      : "text/csv; charset=utf-8";
  return new Response(body, { headers: { "content-type": contentType, "cache-control": getRenderCacheControl(result.access) } });
}
