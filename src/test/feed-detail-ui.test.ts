import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { deleteFeed, updateFeedStatus } from "../lib/client/api-client.ts";

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("feed status and delete actions call the tenant-scoped API", async () => {
  const requests: Array<{ url: string; method: string; body?: string }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: input.toString(), method: init?.method ?? "GET", body: init?.body?.toString() });
    return Response.json({
      data: init?.method === "DELETE"
        ? { deleted: true, id: "feed/id" }
        : { status: "PAUSED" },
    });
  }) as typeof fetch;

  await updateFeedStatus("workspace id", "feed/id", "PAUSED", fetcher);
  await deleteFeed("workspace id", "feed/id", fetcher);

  assert.deepEqual(requests, [
    {
      url: "/api/feeds/feed%2Fid?workspaceId=workspace%20id",
      method: "PATCH",
      body: JSON.stringify({ status: "PAUSED" }),
    },
    {
      url: "/api/feeds/feed%2Fid?workspaceId=workspace%20id",
      method: "DELETE",
      body: undefined,
    },
  ]);
});

test("detail page stays tenant-scoped and renders feed outputs, items, and refresh state", async () => {
  const page = await source("../app/dashboard/feeds/[feedId]/page.tsx");

  assert.match(page, /test\(feedId\)\) notFound\(\)/);
  assert.match(page, /findFeedDetail\(workspaceId, feedId\)/);
  assert.match(page, /listFeedItems\(workspaceId, feedId, 25\)/);
  assert.match(page, /listRecentRefreshJobs\(workspaceId, feedId\)/);
  assert.match(page, /initializePrivateFeedToken\(workspaceId, feed\.id/);
  assert.match(page, /<FeedOutputLinks outputUrls=/);
  assert.match(page, /<FeedItemTable items=/);
  assert.match(page, /Last refresh/);
  assert.match(page, /Next refresh/);
  assert.match(page, /<ManualRefreshButton workspaceId=\{workspaceId\}/);
});

test("output links are copyable and item rows include title, date, and URL", async () => {
  const [links, items] = await Promise.all([
    source("../components/feed-output-links.tsx"),
    source("../components/feed-item-table.tsx"),
  ]);

  assert.match(links, /navigator\.clipboard\.writeText\(url\)/);
  assert.match(links, /Object\.entries\(outputUrls\)/);
  assert.match(links, /aria-label=\{`Copy \$\{label\} link`\}/);
  assert.match(links, /aria-live="polite"/);
  assert.match(items, /item\.title \?\? "Untitled item"/);
  assert.match(items, /displayDate\(item\.datePublished\)/);
  assert.match(items, /href=\{itemUrl\}/);
  assert.match(items, /No items yet/);
  assert.match(items, /href="\/dashboard\/feeds\/new"/);
});

test("settings support pause, resume, and confirmed deletion", async () => {
  const settings = await source("../components/feed-settings-panel.tsx");

  assert.match(settings, /status === "PAUSED" \? "ACTIVE" : "PAUSED"/);
  assert.match(settings, /updateFeedStatus\(workspaceId, feedId, nextStatus\)/);
  assert.match(settings, /window\.confirm/);
  assert.match(settings, /await deleteFeed\(workspaceId, feedId\)/);
  assert.match(settings, /router\.push\("\/dashboard"\)/);
});
