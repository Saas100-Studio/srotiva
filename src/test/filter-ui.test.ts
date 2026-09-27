import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createFeedFilter,
  deleteFeedFilter,
  listFeedFilters,
  previewFeedFilter,
  updateFeedFilter,
} from "../lib/client/api-client.ts";

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("filter clients call the tenant-scoped CRUD and preview APIs", async () => {
  const requests: Array<{ url: string; method: string; body?: string }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const method = init?.method ?? "GET";
    requests.push({ url, method, body: init?.body?.toString() });
    if (method === "DELETE") return Response.json({ data: { deleted: true, id: "rule/id" } });
    if (url.endsWith("/preview")) return Response.json({ data: { includedCount: 1, excludedCount: 1, includedItems: [], excludedItems: [] } });
    if (method === "GET") return Response.json({ data: [] });
    return Response.json({ data: { id: "rule/id", type: "blacklist", field: "any", keywords: ["ads"], isEnabled: method !== "PATCH" } });
  }) as typeof fetch;

  await listFeedFilters("workspace id", "feed/id", fetcher);
  await createFeedFilter("workspace id", "feed/id", { type: "blacklist", field: "any", keywords: ["ads"], isEnabled: true }, fetcher);
  await createFeedFilter("workspace id", "feed/id", { type: "whitelist", field: "title", keywords: ["release"], isEnabled: true }, fetcher);
  await updateFeedFilter("workspace id", "feed/id", "rule/id", { isEnabled: false }, fetcher);
  await deleteFeedFilter("workspace id", "feed/id", "rule/id", fetcher);
  await previewFeedFilter("workspace id", "feed/id", { type: "blacklist", field: "description", keywords: ["sponsored"], isEnabled: true }, fetcher);

  assert.deepEqual(requests, [
    { url: "/api/feeds/feed%2Fid/filters?workspaceId=workspace%20id", method: "GET", body: undefined },
    { url: "/api/feeds/feed%2Fid/filters", method: "POST", body: JSON.stringify({ workspaceId: "workspace id", type: "blacklist", field: "any", keywords: ["ads"], isEnabled: true }) },
    { url: "/api/feeds/feed%2Fid/filters", method: "POST", body: JSON.stringify({ workspaceId: "workspace id", type: "whitelist", field: "title", keywords: ["release"], isEnabled: true }) },
    { url: "/api/feeds/feed%2Fid/filters/rule%2Fid", method: "PATCH", body: JSON.stringify({ workspaceId: "workspace id", isEnabled: false }) },
    { url: "/api/feeds/feed%2Fid/filters/rule%2Fid?workspaceId=workspace%20id", method: "DELETE", body: undefined },
    { url: "/api/feeds/feed%2Fid/filters/preview", method: "POST", body: JSON.stringify({ workspaceId: "workspace id", type: "blacklist", field: "description", keywords: ["sponsored"], isEnabled: true }) },
  ]);
});

test("filter panel renders saved rules, editor actions, validation, and view-only state", async () => {
  const [panel, page] = await Promise.all([
    source("../components/feed-filter-panel.tsx"),
    source("../app/dashboard/feeds/[feedId]/page.tsx"),
  ]);

  assert.match(page, /<FeedFilterPanel workspaceId=\{workspaceId\} feedId=\{feed\.id\} canManage=\{canManage\}/);
  assert.match(panel, /filters\.map\(\(filter\) =>/);
  assert.match(panel, /value="blacklist"/);
  assert.match(panel, /value="whitelist"/);
  assert.match(panel, /Keywords, separated by commas/);
  assert.match(panel, /Enter at least one keyword/);
  assert.match(panel, /updateFeedFilter\(workspaceId, feedId, filter\.id, \{ isEnabled: !filter\.isEnabled \}\)/);
  assert.match(panel, /await deleteFeedFilter\(workspaceId, feedId, filter\.id\)/);
  assert.match(panel, /You have view-only access to these filters/);
  assert.match(panel, /Loading filters…/);
  assert.match(panel, /No filters yet/);
  assert.match(panel, /Filters apply on the next refresh/);
  assert.match(panel, /outputs include active items only/);
  assert.match(panel, /const formDisabled = loading \|\| pending !== null/);
  assert.match(panel, /aria-label=\{`Delete \$\{filter\.type\} filter:/);
  assert.match(panel, /<ErrorState message=\{error\.message\} requestId=\{error\.requestId\}/);
});

test("filter preview renders counts, reasons, and bounded samples", async () => {
  const preview = await source("../components/filter-preview.tsx");

  assert.match(preview, /preview\.includedCount/);
  assert.match(preview, /preview\.excludedCount/);
  assert.match(preview, /Blacklist matched/);
  assert.match(preview, /No whitelist keyword matched/);
  assert.match(preview, /excludedItems\.slice\(0, 5\)/);
  assert.match(preview, /includedItems\.slice\(0, 5\)/);
});
