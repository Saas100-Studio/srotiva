import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("help index links to every MVP help article", async () => {
  const help = await source("../app/help/page.tsx");
  for (const href of ["/help/create-a-feed", "/help/output-formats", "/help/troubleshooting"]) {
    assert.match(help, new RegExp(href));
  }
  assert.doesNotMatch(help, /webhooks|widgets|AI summaries|billing/i);
});

test("feed creation errors retain and display the API request ID", async () => {
  const [client, form, errorState] = await Promise.all([
    source("../lib/client/api-client.ts"),
    source("../components/feed-create-form.tsx"),
    source("../components/error-state.tsx"),
  ]);
  assert.match(client, /result\.requestId \?\? response\.headers\.get\("x-request-id"\)/);
  assert.match(form, /requestError\.requestId/);
  assert.match(errorState, /Request ID:/);
  assert.match(errorState, /href="\/help\/troubleshooting"/);
});

test("dashboard and feed detail empty states lead to useful actions", async () => {
  const [dashboard, items] = await Promise.all([
    source("../app/dashboard/page.tsx"),
    source("../components/feed-item-table.tsx"),
  ]);
  assert.match(dashboard, /href="\/dashboard\/feeds\/new"/);
  assert.match(dashboard, /labelledBy="dashboard-empty-heading"/);
  assert.match(items, /href="\/help\/troubleshooting"/);
});

test("reusable states provide accessible status semantics", async () => {
  const [errorState, loadingState] = await Promise.all([
    source("../components/error-state.tsx"),
    source("../components/loading-state.tsx"),
  ]);
  assert.match(errorState, /role="alert"/);
  assert.match(loadingState, /role="status"/);
  assert.match(loadingState, /aria-live="polite"/);
});
