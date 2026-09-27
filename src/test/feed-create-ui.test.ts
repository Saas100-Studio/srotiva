import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ClientApiError,
  discoverFeed,
  feedCreationErrorMessage,
  saveFeedPreview,
  type FeedPreview,
} from "../lib/client/api-client.ts";

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const preview: FeedPreview = {
  sourceUrl: "https://example.com/feed.xml",
  sourceType: "native",
  sourceFormat: "rss",
  feedTitle: "Example feed",
  feedDescription: null,
  previewItems: [{
    sourceItemId: "one",
    fingerprint: "fingerprint",
    canonicalUrl: "https://example.com/one",
    url: "https://example.com/one",
    title: "First item",
    descriptionText: null,
    descriptionHtml: null,
    author: null,
    imageUrl: null,
    datePublished: null,
    dateModified: null,
    raw: {},
  }],
  warnings: [],
};

test("feed client posts discovery and preview save payloads", async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requests.push({ url: input.toString(), body });
    const data = input.toString().endsWith("discover") ? preview : { id: "feed-id" };
    return Response.json({ data });
  }) as typeof fetch;

  await discoverFeed("workspace-id", "https://example.com", fetcher);
  await saveFeedPreview("workspace-id", preview, "Renamed feed", fetcher);

  assert.equal(requests[0]?.url, "/api/feeds/discover");
  assert.deepEqual(requests[0]?.body, { workspaceId: "workspace-id", url: "https://example.com" });
  assert.equal(requests[1]?.url, "/api/feeds");
  assert.equal(requests[1]?.body.feedTitle, "Renamed feed");
  assert.deepEqual(requests[1]?.body.previewItems, preview.previewItems);
});

test("feed client surfaces the API error message", async () => {
  const fetcher = (async () => Response.json({
    error: { code: "UNSAFE_URL", message: "Use a public website URL." },
    requestId: "request-123",
  }, { status: 422 })) as typeof fetch;

  await assert.rejects(
    discoverFeed("workspace-id", "http://localhost", fetcher),
    (error: unknown) => error instanceof ClientApiError &&
      error.code === "UNSAFE_URL" && error.message === "Use a public website URL." &&
      error.requestId === "request-123",
  );
});

test("feed creation maps unsafe and empty-source errors to plain language", () => {
  assert.equal(
    feedCreationErrorMessage(new ClientApiError("UNSAFE_URL", "The URL is not safe to fetch.")),
    "Use a public website or feed URL.",
  );
  assert.equal(
    feedCreationErrorMessage(new ClientApiError("NO_FEED_CANDIDATE", "Parser did not find a repeated pattern.")),
    "We couldn't find feed items at this URL.",
  );
});

test("creation form guards empty discovery, renders preview state, and redirects after save", async () => {
  const [form, list, page] = await Promise.all([
    source("../components/feed-create-form.tsx"),
    source("../components/feed-preview-list.tsx"),
    source("../app/dashboard/feeds/new/page.tsx"),
  ]);

  assert.match(form, /if \(!url\)/);
  assert.match(form, /discoverFeed\(workspaceId, url\)/);
  assert.match(form, /saveFeedPreview\(workspaceId, preview, feedName\.trim\(\)\)/);
  assert.match(form, /router\.push\(`\/dashboard\/feeds\/\$\{feed\.id\}`\)/);
  assert.match(form, /preview\.previewItems\.length === 0/);
  assert.match(list, /preview\.sourceFormat\.toUpperCase\(\).*feed found/);
  assert.match(list, /Items extracted from webpage/);
  assert.match(list, /item\.title/);
  assert.match(page, /FeedCreateForm workspaceId=\{currentUser\.activeWorkspace\.id\}/);
});
