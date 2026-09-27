import { load } from "cheerio";

import { MorselApiError } from "../api/errors.ts";
import {
  fetchDocument,
  getCrawlerUserAgent,
  type FetchDocumentOptions,
  type FetchDocumentResult,
} from "../crawler/http-fetcher.ts";
import { checkRobotsAllowed } from "../crawler/robots-policy.ts";
import { normalizeUserUrl } from "../crawler/url-safety.ts";
import {
  discoverNativeFeeds,
  type DiscoverNativeFeedsInput,
  type NativeFeedCandidate,
} from "./discover-native-feeds.ts";
import { extractItemsFromHtml } from "./html-extractor.ts";
import {
  parseNativeFeedDocument,
  type NativeFeedItem,
  type ParsedNativeFeedDocument,
} from "./native-parser.ts";

export type FeedPreview = {
  sourceUrl: string;
  sourceType: "native" | "webpage";
  sourceFormat: "rss" | "atom" | "html";
  feedTitle: string;
  feedDescription: string | null;
  previewItems: NativeFeedItem[];
  warnings: string[];
};

export type FeedDiscoveryDependencies = {
  checkRobotsAllowed?: typeof checkRobotsAllowed;
  discoverNativeFeeds?: (input: DiscoverNativeFeedsInput) => Promise<NativeFeedCandidate[]>;
  fetchDocument?: typeof fetchDocument;
  getCrawlerUserAgent?: typeof getCrawlerUserAgent;
};

export type DiscoverFeedPreviewInput = {
  url: unknown;
  fetchOptions?: FetchDocumentOptions;
};

function stableError(error: unknown): MorselApiError {
  if (error instanceof MorselApiError) {
    if (error.code === "INVALID_URL") return error;
    if (["UNSAFE_URL", "UNSUPPORTED_PROTOCOL", "UNSAFE_PORT"].includes(error.code)) {
      return new MorselApiError(422, "UNSAFE_URL", "The URL is not safe to fetch.", error.details);
    }
    if (["NO_ITEMS_EXTRACTED", "INVALID_FEED"].includes(error.code)) {
      return new MorselApiError(
        422,
        "NO_FEED_CANDIDATE",
        "No usable native feed or repeated webpage item pattern was found.",
        error.details,
      );
    }
    if (error.code === "NO_FEED_CANDIDATE") return error;
  }

  return new MorselApiError(
    502,
    "FETCH_FAILED",
    "The source could not be fetched.",
    error instanceof MorselApiError ? { cause: error.code } : {},
  );
}

function nativePreview(source: FetchDocumentResult, parsed: ParsedNativeFeedDocument): FeedPreview {
  return {
    sourceUrl: source.finalUrl,
    sourceType: "native",
    sourceFormat: parsed.type,
    feedTitle: parsed.feed.feedTitle ?? new URL(source.finalUrl).hostname,
    feedDescription: parsed.feed.feedDescription,
    previewItems: parsed.feed.items.slice(0, 10),
    warnings: [],
  };
}

export async function discoverFeedPreview(
  input: DiscoverFeedPreviewInput,
  dependencies: FeedDiscoveryDependencies = {},
): Promise<FeedPreview> {
  try {
    const sourceUrl = normalizeUserUrl(input.url).href;
    const fetchOptions = input.fetchOptions ?? {};
    const userAgent = fetchOptions.userAgent ??
      (dependencies.getCrawlerUserAgent ?? getCrawlerUserAgent)();
    const checkRobots = dependencies.checkRobotsAllowed ?? checkRobotsAllowed;
    const fetch = dependencies.fetchDocument ?? fetchDocument;
    const safeFetch = async (url: string): Promise<FetchDocumentResult> => {
      await checkRobots({ targetUrl: url, userAgent, fetchOptions });
      return fetch(url, {
        ...fetchOptions,
        userAgent,
        beforeRedirect: async (redirectUrl) => {
          await checkRobots({ targetUrl: redirectUrl, userAgent, fetchOptions });
        },
      });
    };

    const page = await safeFetch(sourceUrl);
    try {
      return nativePreview(page, parseNativeFeedDocument({
        url: page.finalUrl,
        bodyText: page.bodyText,
        contentType: page.contentType,
      }));
    } catch (error) {
      if (!(error instanceof MorselApiError) || error.code !== "INVALID_FEED") throw error;
    }

    const candidates = await (dependencies.discoverNativeFeeds ?? discoverNativeFeeds)({
      sourceUrl,
      fetchOptions: { ...fetchOptions, userAgent },
    });
    for (const candidate of candidates) {
      try {
        const document = await safeFetch(candidate.url);
        return nativePreview(document, parseNativeFeedDocument({
          url: document.finalUrl,
          bodyText: document.bodyText,
          contentType: document.contentType,
        }));
      } catch (error) {
        if (!(error instanceof MorselApiError)) throw error;
      }
    }

    const extracted = extractItemsFromHtml({
      pageUrl: page.finalUrl,
      bodyText: page.bodyText,
    });
    const $ = load(page.bodyText);
    return {
      sourceUrl: page.finalUrl,
      sourceType: "webpage",
      sourceFormat: "html",
      feedTitle: $("title").first().text().trim() || new URL(page.finalUrl).hostname,
      feedDescription: $('meta[name="description"]').first().attr("content")?.trim() || null,
      previewItems: extracted.items.slice(0, 10),
      warnings: extracted.warnings,
    };
  } catch (error) {
    throw stableError(error);
  }
}
