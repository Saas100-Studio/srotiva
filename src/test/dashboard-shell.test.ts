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

test("homepage includes signup and login links without unsupported claims", async () => {
  const home = await source("../app/page.tsx");

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
