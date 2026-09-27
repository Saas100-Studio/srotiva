import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";

import { MorselApiError } from "../api/errors.ts";
import { createItemFingerprint } from "./fingerprint.ts";
import { cleanHtmlText } from "./html-cleanup.ts";
import type { NativeFeedItem } from "./native-parser.ts";

type HtmlNode = ReturnType<CheerioAPI> extends Cheerio<infer Node> ? Node : never;
const MIN_CONFIDENCE = 0.7;

export type HtmlExtractionResult = {
  items: NativeFeedItem[];
  confidence: number;
  warnings: string[];
};

export type ExtractItemsFromHtmlInput = {
  pageUrl: string;
  bodyText: string;
};

function httpUrl(value: string | undefined, baseUrl: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function parsedDate(value: string | undefined): Date | null {
  if (!value) return null;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}

function cardNodes($: CheerioAPI): HtmlNode[] {
  const articles = $("article").toArray();
  const cards = new Set<HtmlNode>(articles);
  const scope = $("main").length ? "main" : "body";
  $(`${scope} h1, ${scope} h2, ${scope} h3`).each((_index, heading) => {
    const $heading = $(heading);
    if (!$heading.closest("a[href]").length && !$heading.find("a[href]").length &&
        !$heading.closest("article, li, section, div").find("a[href]").length) return;
    cards.add($heading.closest("article, li, section, div").get(0) ?? heading);
  });
  return [...cards];
}

function extractCard(
  $: CheerioAPI,
  node: HtmlNode,
  pageUrl: string,
  fallbackImageUrl: string | null,
): NativeFeedItem | null {
  const card = $(node);
  const heading = card.find("h1, h2, h3").first();
  const anchor = heading.closest("a[href]").first().length
    ? heading.closest("a[href]").first()
    : heading.find("a[href]").first().length
      ? heading.find("a[href]").first()
      : card.find("a[href]").first();
  const canonicalUrl = httpUrl(anchor.attr("href"), pageUrl);
  const title = (heading.text() || anchor.text()).replace(/\s+/g, " ").trim() || null;
  if (!canonicalUrl || !title) return null;

  const description = card.find("p").first();
  const descriptionText = cleanHtmlText(description.length ? $.html(description) : null);
  const imageUrl = httpUrl(card.find("img[src]").first().attr("src"), pageUrl) ?? fallbackImageUrl;
  const datePublished = parsedDate(card.find("time[datetime]").first().attr("datetime"));

  return {
    sourceItemId: null,
    fingerprint: createItemFingerprint({ feedUrl: pageUrl, canonicalUrl, title, datePublished }),
    canonicalUrl,
    url: canonicalUrl,
    title,
    descriptionText,
    descriptionHtml: null,
    author: null,
    imageUrl,
    datePublished,
    dateModified: null,
    raw: {},
  };
}

export function extractItemsFromHtml(input: ExtractItemsFromHtmlInput): HtmlExtractionResult {
  const pageUrl = httpUrl(input.pageUrl, input.pageUrl);
  if (!pageUrl) {
    throw new MorselApiError(422, "INVALID_URL", "The page URL must be a safe HTTP or HTTPS URL.");
  }

  const $ = cheerio.load(input.bodyText);
  $("script, style, noscript, template").remove();
  const fallbackImageUrl = httpUrl(
    $('meta[property="og:image"]').first().attr("content"),
    pageUrl,
  );
  const unique = new Map<string, NativeFeedItem>();
  for (const node of cardNodes($)) {
    const item = extractCard($, node, pageUrl, fallbackImageUrl);
    if (item?.canonicalUrl && !unique.has(item.canonicalUrl)) unique.set(item.canonicalUrl, item);
    if (unique.size === 25) break;
  }

  const items = [...unique.values()];
  if (items.length < 2) {
    throw new MorselApiError(
      422,
      "NO_ITEMS_EXTRACTED",
      "No repeated article or card pattern could be extracted.",
      { confidence: 0, warnings: ["NO_REPEATED_ITEM_PATTERN"] },
    );
  }

  const ratios = {
    descriptions: items.filter((item) => item.descriptionText).length / items.length,
    images: items.filter((item) => item.imageUrl).length / items.length,
    dates: items.filter((item) => item.datePublished).length / items.length,
  };
  const confidence = Math.round(Math.min(
    1,
    0.6 + (items.length >= 3 ? 0.15 : 0) +
      ratios.descriptions * 0.05 + ratios.images * 0.1 + ratios.dates * 0.1,
  ) * 100) / 100;
  const warnings = [
    ...(ratios.descriptions < 1 ? ["SOME_ITEMS_MISSING_DESCRIPTION"] : []),
    ...(ratios.images < 1 ? ["SOME_ITEMS_MISSING_IMAGE"] : []),
    ...(ratios.dates < 1 ? ["SOME_ITEMS_MISSING_DATE"] : []),
  ];

  if (confidence < MIN_CONFIDENCE) {
    throw new MorselApiError(
      422,
      "NO_ITEMS_EXTRACTED",
      "The repeated links did not form a confident article or card pattern.",
      { confidence, warnings: ["LOW_CONFIDENCE", ...warnings] },
    );
  }

  return { items, confidence, warnings };
}
