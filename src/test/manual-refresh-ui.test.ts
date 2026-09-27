import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { requestFeedRefresh } from "../lib/client/api-client.ts";

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("manual refresh client posts to the tenant-scoped feed route", async () => {
  let seen: { url: string; body: string } | undefined;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen = { url: input.toString(), body: String(init?.body) };
    return Response.json({ data: {
      job: { id: "job", status: "QUEUED" },
      cooldownSeconds: 300,
      cooldownUntil: "2026-01-01T00:05:00.000Z",
    } });
  }) as typeof fetch;

  await requestFeedRefresh("workspace id", "feed/id", fetcher);
  assert.deepEqual(seen, {
    url: "/api/feeds/feed%2Fid/refresh",
    body: JSON.stringify({ workspaceId: "workspace id" }),
  });
});

test("manual refresh UI shows queued, throttled, and paused states", async () => {
  const [button, page] = await Promise.all([
    source("../components/manual-refresh-button.tsx"),
    source("../app/dashboard/feeds/[feedId]/page.tsx"),
  ]);

  assert.match(button, /Refresh queued\./);
  assert.match(button, /REFRESH_THROTTLED/);
  assert.match(button, /secondsRemaining/);
  assert.match(button, /disabled=\{pending \|\| queued \|\| paused\}/);
  assert.match(button, /Resume this feed to refresh it\./);
  assert.match(button, /aria-live="polite"/);
  assert.match(button, /requestId: error instanceof ClientApiError \? error\.requestId/);
  assert.match(button, /<ErrorState message=\{error\.message\} requestId=\{error\.requestId\}/);
  assert.match(page, /feed\.status === "PAUSED"/);
  assert.match(page, /canManage \? \(/);
});
