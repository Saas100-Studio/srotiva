import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("help index links to every production help article and contact", async () => {
  const help = await source("../app/help/page.tsx");
  for (const href of [
    "/help/create-a-feed",
    "/help/output-formats",
    "/help/refreshes-and-history",
    "/help/filters",
    "/help/private-feeds",
    "/help/accounts-and-limits",
    "/help/troubleshooting",
    "/help/crawler-behavior",
    "/contact",
  ]) {
    assert.match(help, new RegExp(href));
  }
  assert.doesNotMatch(help, /webhooks|widgets|AI summaries|billing/i);
});

test("contact page publishes support coverage without requesting secrets", async () => {
  const contact = await source("../app/contact/page.tsx");
  assert.match(contact, /gouresh5901@gmail\.com/);
  assert.match(contact, /Indian business days during IST working hours/);
  assert.match(contact, /Do not send your password, session cookie, or a private feed access token/);
  assert.match(contact, /Security report/);
  assert.match(contact, /Takedown request/);
  assert.doesNotMatch(contact, /within \d+ (?:hour|day)s?/i);
});

test("help content matches implemented refresh, filter, private-feed, and account behavior", async () => {
  const [refreshes, filters, privateFeeds, accounts, crawler] = await Promise.all([
    source("../app/help/refreshes-and-history/page.tsx"),
    source("../app/help/filters/page.tsx"),
    source("../app/help/private-feeds/page.tsx"),
    source("../app/help/accounts-and-limits/page.tsx"),
    source("../app/help/crawler-behavior/page.tsx"),
  ]);
  assert.match(refreshes, /queued rather than fetched in the browser/);
  assert.match(refreshes, /previously published items available/);
  assert.match(filters, /Blacklist matches take precedence/);
  assert.match(filters, /case-insensitive substring matching/);
  assert.match(privateFeeds, /Every old private output URL stops working immediately/);
  assert.match(accounts, /25 feeds and 10,000 feed items/);
  assert.match(accounts, /1,000 manual refreshes per UTC calendar month/);
  assert.match(crawler, /SrotivaBot/);
  assert.match(crawler, /robots\.txt/);
  assert.match(crawler, /does not bypass logins, paywalls, CAPTCHAs/);
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
