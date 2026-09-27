import type { NativeFeedItem } from "./native-parser.ts";

const columns = [
  "sourceItemId",
  "fingerprint",
  "canonicalUrl",
  "url",
  "title",
  "descriptionText",
  "descriptionHtml",
  "author",
  "imageUrl",
  "datePublished",
  "dateModified",
] as const;

function safeCell(value: string): string {
  const safe = /^\s*[=+\-@]/u.test(value) ? `'${value}` : value;
  return /[",\r\n]/u.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function value(item: NativeFeedItem, column: (typeof columns)[number]): string {
  const current = item[column];
  return current instanceof Date ? current.toISOString() : current ?? "";
}

export function renderCsvFeed({ items }: { items: NativeFeedItem[] }): string {
  return [
    columns.join(","),
    ...items.map((item) => columns.map((column) => safeCell(value(item, column))).join(",")),
  ].join("\r\n");
}
