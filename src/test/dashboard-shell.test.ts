import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { requireDashboardUser } from "../lib/auth/dashboard.ts";

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("unauthenticated dashboard access redirects to login", () => {
  assert.throws(
    () => requireDashboardUser(null),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String(error.digest).includes("/login"),
  );
});

test("dashboard layout protects every nested dashboard route", async () => {
  const layout = await source("../app/dashboard/layout.tsx");

  assert.match(layout, /getOptionalCurrentUserFromCookieHeader\(requestHeaders\.get\("cookie"\)\)/);
  assert.match(layout, /requireDashboardUser\(/);
  assert.match(layout, /<AppShell currentUser=\{currentUser\}>\{children\}<\/AppShell>/);
});

test("authenticated dashboard renders workspace identity and an empty state", async () => {
  const [page, switcher] = await Promise.all([
    source("../app/dashboard/page.tsx"),
    source("../components/workspace-switcher.tsx"),
  ]);

  assert.match(page, /workspaceName=\{currentUser\.activeWorkspace\.name\}/);
  assert.match(page, /Create your first feed/);
  assert.match(page, /href="\/dashboard\/feeds\/new"/);
  assert.match(switcher, /workspace\.name/);
});

test("dashboard renders computed feed health badges", async () => {
  const page = await source("../app/dashboard/page.tsx");

  assert.match(page, /getFeedHealth\(feed\)\.healthStatus/);
  assert.match(page, /<FeedStatusBadge status=/);
});

test("dashboard uses bounded server-side search and pagination", async () => {
  const [page, repository] = await Promise.all([
    source("../app/dashboard/page.tsx"),
    source("../lib/db/repositories/feeds.ts"),
  ]);

  assert.match(page, /listDashboardFeeds\(currentUser\.activeWorkspace\.id/);
  assert.match(page, /name="q"/);
  assert.match(page, /<span>Search feeds<\/span>/);
  assert.match(page, /hasPreviousPage/);
  assert.match(page, /hasNextPage/);
  assert.match(page, /result\.page > 1 && result\.feeds\.length === 0/);
  assert.doesNotMatch(page, /feeds\.slice\(/);
  assert.match(repository, /DASHBOARD_FEED_PAGE_SIZE \+ 1/);
  assert.match(repository, /contains: normalizedQuery/);
  assert.match(repository, /skip: \(normalizedPage - 1\) \* DASHBOARD_FEED_PAGE_SIZE/);
});

test("homepage includes signup and login links without unsupported claims", async () => {
  const home = await source("../components/landing-page.tsx");

  assert.match(home, /href="\/signup"/);
  assert.match(home, /href="\/login"/);
  assert.doesNotMatch(home, /Widgets|Slack|Discord|newsletter/i);
});

test("app shell contains the required navigation", async () => {
  const shell = await source("../components/app-shell.tsx");

  for (const [label, href] of [
    ["Feeds", "/dashboard"],
    ["Create feed", "/dashboard/feeds/new"],
    ["Settings", "/dashboard/settings"],
    ["Help", "/help"],
  ]) {
    assert.match(shell, new RegExp(`\\["${label}", "${href}"\\]`));
  }
});

test("application provides recovery experiences for missing and failed routes", async () => {
  const [notFound, routeError, globalError] = await Promise.all([
    source("../app/not-found.tsx"),
    source("../app/dashboard/error.tsx"),
    source("../app/global-error.tsx"),
  ]);

  assert.match(notFound, /Page not found/);
  assert.match(notFound, /href="\/dashboard"/);
  assert.match(routeError, /onClick=\{reset\}/);
  assert.match(routeError, /Your data has not been changed/);
  assert.match(globalError, /<html lang="en">/);
  assert.match(globalError, /onClick=\{reset\}/);
});
