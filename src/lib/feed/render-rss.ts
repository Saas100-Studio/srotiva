import type { NativeFeedItem, ParsedNativeFeed } from "./native-parser.ts";

type RenderRssInput = {
  feed: Omit<ParsedNativeFeed, "items">;
  items: NativeFeedItem[];
  selfUrl: string;
};

function xml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function element(name: string, value: string | null): string {
  return value === null ? "" : `<${name}>${xml(value)}</${name}>`;
}

export function renderRssFeed({ feed, items, selfUrl }: RenderRssInput): string {
  const renderedItems = items.map((item) => {
    const fields = [
      element("title", item.title ?? ""),
      element("link", item.canonicalUrl ?? item.url),
      `<guid isPermaLink="false">${xml(item.sourceItemId ?? item.fingerprint)}</guid>`,
      element("description", item.descriptionHtml ?? item.descriptionText),
      element("dc:creator", item.author),
      item.datePublished ? `<pubDate>${item.datePublished.toUTCString()}</pubDate>` : "",
    ].filter(Boolean);
    return `<item>${fields.join("")}</item>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>',
    element("title", feed.feedTitle ?? ""),
    element("link", feed.siteUrl ?? selfUrl),
    element("description", feed.feedDescription ?? ""),
    `<atom:link href="${xml(selfUrl)}" rel="self" type="application/rss+xml" />`,
    ...renderedItems,
    "</channel></rss>",
  ].join("");
}
