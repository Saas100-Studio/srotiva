import { XMLParser, XMLValidator } from "fast-xml-parser";

import { MorselApiError } from "../api/errors.ts";
import { createItemFingerprint } from "./fingerprint.ts";

type XmlRecord = Record<string, unknown>;

export type NativeFeedItem = {
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
  raw: XmlRecord;
};

export type ParsedNativeFeed = {
  feedTitle: string | null;
  feedDescription: string | null;
  siteUrl: string | null;
  items: NativeFeedItem[];
};

export type ParseNativeFeedInput = {
  url: string;
  bodyText: string;
  contentType?: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "#cdata",
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: false,
  trimValues: true,
});

function invalidFeed(input: ParseNativeFeedInput): MorselApiError {
  return new MorselApiError(422, "INVALID_FEED", "The document is not a valid RSS or Atom feed.", {
    url: input.url,
    contentType: input.contentType ?? null,
  });
}

function record(value: unknown): XmlRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as XmlRecord)
    : null;
}

function list(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function decodeXmlEntities(value: string): string {
  const named = { amp: "&", lt: "<", gt: ">", apos: "'", quot: '"' } as const;
  return value.replace(
    /&(amp|lt|gt|apos|quot|#\d+|#x[\da-f]+);/gi,
    (entity, name: string) => {
      if (name.startsWith("#")) {
        const codePoint = Number.parseInt(
          name.slice(name[1]?.toLowerCase() === "x" ? 2 : 1),
          name[1]?.toLowerCase() === "x" ? 16 : 10,
        );
        return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      return named[name.toLowerCase() as keyof typeof named];
    },
  );
}

function text(value: unknown): string | null {
  if (typeof value === "string") return decodeXmlEntities(value).trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const object = record(value);
  if (!object) return null;
  if (typeof object["#cdata"] === "string") return object["#cdata"].trim() || null;
  return text(object["#text"]);
}

function resolvedUrl(value: unknown, feedUrl: string): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate, feedUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function date(value: unknown): Date | null {
  const candidate = text(value);
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function plainText(html: string | null): string | null {
  if (!html) return null;
  const value = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return value || null;
}

function atomLink(value: unknown, feedUrl: string, rel = "alternate"): string | null {
  for (const candidate of list(value)) {
    const link = record(candidate);
    if (!link) continue;
    if ((text(link["@_rel"]) ?? "alternate") === rel) {
      const href = resolvedUrl(link["@_href"], feedUrl);
      if (href) return href;
    }
  }
  return null;
}

function rssImage(item: XmlRecord, feedUrl: string): string | null {
  for (const key of ["media:content", "media:thumbnail"]) {
    for (const candidate of list(item[key])) {
      const media = record(candidate);
      const url = resolvedUrl(media?.["@_url"], feedUrl);
      if (url) return url;
    }
  }
  for (const candidate of list(item.enclosure)) {
    const enclosure = record(candidate);
    if (text(enclosure?.["@_type"])?.toLowerCase().startsWith("image/")) {
      return resolvedUrl(enclosure?.["@_url"], feedUrl);
    }
  }
  return null;
}

function normalizeRssItem(value: unknown, feedUrl: string): NativeFeedItem | null {
  const raw = record(value);
  if (!raw) return null;
  const canonicalUrl = resolvedUrl(raw.link, feedUrl);
  const sourceItemId = text(raw.guid);
  const title = text(raw.title);
  const descriptionHtml = text(raw["content:encoded"] ?? raw.description);
  const datePublished = date(raw.pubDate ?? raw["dc:date"]);
  const dateModified = date(raw.lastBuildDate ?? raw.updated);

  return {
    sourceItemId,
    fingerprint: createItemFingerprint({
      feedUrl,
      canonicalUrl,
      sourceItemId,
      title,
      datePublished,
    }),
    canonicalUrl,
    url: canonicalUrl,
    title,
    descriptionText: plainText(descriptionHtml),
    descriptionHtml,
    author: text(raw["dc:creator"] ?? raw.author),
    imageUrl: rssImage(raw, feedUrl),
    datePublished,
    dateModified,
    raw,
  };
}

function normalizeAtomItem(value: unknown, feedUrl: string): NativeFeedItem | null {
  const raw = record(value);
  if (!raw) return null;
  const canonicalUrl = atomLink(raw.link, feedUrl);
  const sourceItemId = text(raw.id);
  const title = text(raw.title);
  const descriptionHtml = text(raw.content ?? raw.summary);
  const datePublished = date(raw.published ?? raw.updated);
  const dateModified = date(raw.updated);
  const author = record(raw.author);

  return {
    sourceItemId,
    fingerprint: createItemFingerprint({
      feedUrl,
      canonicalUrl,
      sourceItemId,
      title,
      datePublished,
    }),
    canonicalUrl,
    url: canonicalUrl,
    title,
    descriptionText: plainText(descriptionHtml),
    descriptionHtml,
    author: text(author?.name ?? raw.author),
    imageUrl: atomLink(raw.link, feedUrl, "enclosure"),
    datePublished,
    dateModified,
    raw,
  };
}

export function parseNativeFeed(input: ParseNativeFeedInput): ParsedNativeFeed {
  if (XMLValidator.validate(input.bodyText) !== true) throw invalidFeed(input);

  let document: XmlRecord;
  try {
    document = parser.parse(input.bodyText) as XmlRecord;
  } catch {
    throw invalidFeed(input);
  }

  const channel = record(record(document.rss)?.channel);
  if (channel) {
    return {
      feedTitle: text(channel.title),
      feedDescription: text(channel.description),
      siteUrl: resolvedUrl(channel.link, input.url),
      items: list(channel.item)
        .map((item) => normalizeRssItem(item, input.url))
        .filter((item): item is NativeFeedItem => item !== null),
    };
  }

  const feed = record(document.feed);
  if (feed) {
    return {
      feedTitle: text(feed.title),
      feedDescription: text(feed.subtitle),
      siteUrl: atomLink(feed.link, input.url),
      items: list(feed.entry)
        .map((entry) => normalizeAtomItem(entry, input.url))
        .filter((item): item is NativeFeedItem => item !== null),
    };
  }

  throw invalidFeed(input);
}
