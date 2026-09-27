import { FeedSourceType, FeedStatus, type RefreshTrigger } from "@prisma/client";

import { MorselApiError } from "../api/errors.ts";
import {
  fetchDocument,
  getCrawlerUserAgent,
  type FetchDocumentOptions,
} from "../crawler/http-fetcher.ts";
import { checkRobotsAllowed } from "../crawler/robots-policy.ts";
import {
  findFeedForRefresh,
  recordRefreshFailure,
  recordRefreshSuccess,
} from "../db/repositories/feeds.ts";
import { extractItemsFromHtml } from "./html-extractor.ts";
import { createItemFingerprint } from "./fingerprint.ts";
import { parseNativeFeed } from "./native-parser.ts";

type RefreshFeedInput = {
  feedId: string;
  trigger: RefreshTrigger;
  jobId?: string;
  fetchOptions?: FetchDocumentOptions;
};

type RefreshFeedDependencies = {
  fetchDocument?: typeof fetchDocument;
  checkRobotsAllowed?: typeof checkRobotsAllowed;
  getCrawlerUserAgent?: typeof getCrawlerUserAgent;
};

function safeErrorDetails(details: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(details).map(([key, value]) => {
    if (typeof value !== "string" || !key.toLowerCase().includes("url")) return [key, value];
    try {
      const url = new URL(value);
      url.username = "";
      url.password = "";
      url.search = "";
      url.hash = "";
      return [key, url.toString()];
    } catch {
      return [key, "[redacted]"];
    }
  }));
}

function refreshError(error: unknown): { code: string; message: string; details: Record<string, unknown> } {
  if (error instanceof MorselApiError) {
    return { code: error.code, message: error.message, details: safeErrorDetails(error.details) };
  }
  return {
    code: "REFRESH_FAILED",
    message: "The feed refresh failed.",
    details: {},
  };
}

export async function refreshFeed(
  input: RefreshFeedInput,
  dependencies: RefreshFeedDependencies = {},
) {
  let source: {
    httpStatus: number | null;
    fetchDurationMs: number | null;
    etag: string | null;
    lastModified: string | null;
  } | undefined;
  try {
    const feed = await findFeedForRefresh(input.feedId);
    if (!feed) {
      throw new MorselApiError(404, "FEED_NOT_FOUND", "The feed could not be refreshed.");
    }
    if (feed.status !== FeedStatus.ACTIVE &&
        feed.status !== FeedStatus.DEGRADED && feed.status !== FeedStatus.FAILED) {
      throw new MorselApiError(409, "FEED_NOT_REFRESHABLE", "The feed is not active for refresh.");
    }
    if (feed.sourceType !== FeedSourceType.NATIVE && feed.sourceType !== FeedSourceType.WEBPAGE) {
      throw new MorselApiError(422, "UNSUPPORTED_SOURCE_TYPE", "This feed source type is not refreshable.");
    }

    const fetchOptions = input.fetchOptions ?? {};
    const userAgent = fetchOptions.userAgent ??
      (dependencies.getCrawlerUserAgent ?? getCrawlerUserAgent)();
    const checkRobots = dependencies.checkRobotsAllowed ?? checkRobotsAllowed;
    const fetch = dependencies.fetchDocument ?? fetchDocument;
    const sourceUrl = feed.sources[0]?.url ?? feed.sourceUrl;
    await checkRobots({ targetUrl: sourceUrl, userAgent, fetchOptions });
    const response = await fetch(sourceUrl, {
      ...fetchOptions,
      userAgent,
      beforeRedirect: async (url) => {
        await checkRobots({ targetUrl: url, userAgent, fetchOptions });
      },
    });
    source = {
      httpStatus: response.status,
      fetchDurationMs: Math.round(response.durationMs),
      etag: response.headers.etag ?? null,
      lastModified: response.headers["last-modified"] ?? null,
    };
    const parsed = feed.sourceType === FeedSourceType.NATIVE
      ? {
          items: parseNativeFeed({
            url: response.finalUrl,
            bodyText: response.bodyText,
            contentType: response.contentType,
          }).items,
          warnings: [],
        }
      : extractItemsFromHtml({ pageUrl: response.finalUrl, bodyText: response.bodyText });
    const normalizedItems = parsed.items.map((item) => ({
      ...item,
      fingerprint: createItemFingerprint({
        feedUrl: feed.sourceUrl,
        canonicalUrl: item.canonicalUrl,
        sourceItemId: item.sourceItemId,
        title: item.title,
        datePublished: item.datePublished,
      }),
    }));
    const items = [...new Map(normalizedItems.map((item) => [item.fingerprint, item])).values()];

    return recordRefreshSuccess({
      feedId: feed.id,
      sourceId: feed.sources[0]?.id ?? null,
      items,
      warnings: parsed.warnings,
      httpStatus: response.status,
      fetchDurationMs: response.durationMs,
      etag: response.headers.etag ?? null,
      lastModified: response.headers["last-modified"] ?? null,
    });
  } catch (error) {
    const failure = refreshError(error);
    await recordRefreshFailure({
      feedId: input.feedId,
      jobId: input.jobId,
      trigger: input.trigger,
      source,
      ...failure,
    });
    throw error;
  }
}
