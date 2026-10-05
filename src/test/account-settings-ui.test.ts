import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dashboard navigation exposes real account settings", async () => {
  const [shell, page, form] = await Promise.all([
    readFile(new URL("../components/app-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/account-settings.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(shell, /\["Settings", "\/dashboard\/settings"\]/);
  assert.match(page, /<AccountSettings/);
  assert.match(form, /Change password/);
  assert.match(form, /Download data export/);
  assert.match(form, /Type DELETE to confirm/);
  assert.match(form, /window\.confirm/);
});
