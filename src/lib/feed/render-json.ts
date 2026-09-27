import type { NativeFeedItem, ParsedNativeFeed } from "./native-parser.ts";

type RenderJsonInput = {
  feed: Omit<ParsedNativeFeed, "items">;
  items: NativeFeedItem[];
};

export function renderJsonFeed({ feed, items }: RenderJsonInput): string {
  return JSON.stringify(
    {
      feed: {
        feedTitle: feed.feedTitle,
        feedDescription: feed.feedDescription,
        siteUrl: feed.siteUrl,
      },
      items: items.map((item) => ({
        sourceItemId: item.sourceItemId,
        fingerprint: item.fingerprint,
        canonicalUrl: item.canonicalUrl,
        url: item.url,
        title: item.title,
        descriptionText: item.descriptionText,
        descriptionHtml: item.descriptionHtml,
        author: item.author,
        imageUrl: item.imageUrl,
        datePublished: item.datePublished?.toISOString() ?? null,
        dateModified: item.dateModified?.toISOString() ?? null,
      })),
    },
    null,
    2,
  );
}
