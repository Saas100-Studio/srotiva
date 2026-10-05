import { SrotivaApiError } from "../api/errors.ts";
import {
  fetchDocument,
  getCrawlerUserAgent,
  type FetchDocumentOptions,
} from "../crawler/http-fetcher.ts";
import { checkRobotsAllowed } from "../crawler/robots-policy.ts";
import { parseNativeFeedDocument } from "./native-parser.ts";

const COMMON_PATHS = ["/feed", "/feed.xml", "/rss", "/rss.xml", "/atom.xml"];

export type NativeFeedCandidate = {
  url: string;
  type: "rss" | "atom";
  title: string;
  source: "alternate_link" | "common_path";
  confidence: number;
};

export type DiscoverNativeFeedsInput = {
  sourceUrl: string;
  fetchOptions?: FetchDocumentOptions;
};

function attributes(source: string): Map<string, string> {
  const result = new Map<string, string>();
  const pattern = /([^\s"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    result.set(match[1]!.toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function alternateCandidates(bodyText: string, pageUrl: string): NativeFeedCandidate[] {
  const candidates: NativeFeedCandidate[] = [];
  for (const match of bodyText.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = attributes(match[1]!);
    if (!attrs.get("rel")?.toLowerCase().split(/\s+/).includes("alternate")) continue;
    const mediaType = attrs.get("type")?.toLowerCase().split(";", 1)[0]?.trim();
    const type = mediaType === "application/rss+xml"
      ? "rss"
      : mediaType === "application/atom+xml"
        ? "atom"
        : null;
    const href = attrs.get("href")?.replace(/&amp;/gi, "&");
    if (!type || !href) continue;

    try {
      const url = new URL(href, pageUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      url.hash = "";
      candidates.push({
        url: url.href,
        type,
        title: attrs.get("title")?.trim() || `${type.toUpperCase()} feed`,
        source: "alternate_link",
        confidence: 0.95,
      });
    } catch {
      // Ignore malformed page hints and continue with common-path discovery.
    }
  }
  return candidates;
}

function uniqueRanked(candidates: NativeFeedCandidate[]): NativeFeedCandidate[] {
  const unique = new Map<string, NativeFeedCandidate>();
  for (const candidate of candidates) {
    const previous = unique.get(candidate.url);
    if (!previous || candidate.confidence > previous.confidence) {
      unique.set(candidate.url, candidate);
    }
  }
  return [...unique.values()].sort((left, right) => right.confidence - left.confidence);
}

async function assertRobotsAllowed(
  targetUrl: string | URL,
  userAgent: string,
  fetchOptions: FetchDocumentOptions,
): Promise<void> {
  await checkRobotsAllowed({ targetUrl, userAgent, fetchOptions });
}

function redirectOptions(
  fetchOptions: FetchDocumentOptions,
  userAgent: string,
  requiredOrigin?: string,
): FetchDocumentOptions {
  return {
    ...fetchOptions,
    beforeRedirect: async (url) => {
      if (requiredOrigin && url.origin !== requiredOrigin) {
        throw new SrotivaApiError(
          400,
          "CROSS_ORIGIN_FEED_PROBE",
          "A common feed path redirected to a different origin.",
          { url: url.href, requiredOrigin },
        );
      }
      await assertRobotsAllowed(url, userAgent, fetchOptions);
    },
  };
}

export async function discoverNativeFeeds(
  input: DiscoverNativeFeedsInput,
): Promise<NativeFeedCandidate[]> {
  const fetchOptions = input.fetchOptions ?? {};
  const userAgent = fetchOptions.userAgent ?? getCrawlerUserAgent();
  await assertRobotsAllowed(input.sourceUrl, userAgent, fetchOptions);
  const page = await fetchDocument(
    input.sourceUrl,
    redirectOptions(fetchOptions, userAgent),
  );
  const linked = uniqueRanked(alternateCandidates(page.bodyText, page.finalUrl));
  if (linked.length > 0) return linked;

  const origin = new URL(page.finalUrl).origin;
  const candidates: NativeFeedCandidate[] = [];
  for (const path of COMMON_PATHS) {
    const url = new URL(path, origin);
    try {
      await assertRobotsAllowed(url, userAgent, fetchOptions);
      const response = await fetchDocument(
        url,
        redirectOptions(fetchOptions, userAgent, origin),
      );
      const parsed = parseNativeFeedDocument({
        url: response.finalUrl,
        bodyText: response.bodyText,
        contentType: response.contentType,
      });
      candidates.push({
        url: response.finalUrl,
        type: parsed.type,
        title: parsed.feed.feedTitle ?? "Native feed",
        source: "common_path",
        confidence: 0.75,
      });
    } catch (error) {
      if (!(error instanceof SrotivaApiError)) throw error;
    }
  }
  return uniqueRanked(candidates);
}
