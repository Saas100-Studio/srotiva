import { createHash } from "node:crypto";

export type FeedItemFingerprintInput = {
  feedUrl: string;
  canonicalUrl?: string | null;
  sourceItemId?: string | null;
  title?: string | null;
  datePublished?: Date | string | null;
};

function normalizedText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function normalizedDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? normalizedText(String(value)) : date.toISOString();
}

export function createItemFingerprint(input: FeedItemFingerprintInput): string {
  const identity = input.canonicalUrl?.trim()
    ? ["url", input.canonicalUrl.trim()]
    : input.sourceItemId?.trim()
      ? ["id", input.sourceItemId.trim()]
      : ["title-date", normalizedText(input.title), normalizedDate(input.datePublished)];

  return createHash("sha256")
    .update(JSON.stringify([input.feedUrl, ...identity]))
    .digest("hex");
}
