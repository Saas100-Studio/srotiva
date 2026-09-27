import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { GET, handleHealthGet } from "../app/api/health/route.ts";
import { validateEnvironment } from "../../scripts/validate-env.mjs";

test("health reports database readiness without exposing configuration", async () => {
  assert.ok(process.env.DATABASE_URL);
  const response = await GET();
  const body = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    status: "ok",
    version: "1.0.0",
    database: "ok",
    refreshProcesses: "not_checked",
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(JSON.stringify(body), /secret|postgres|crawler_user_agent/iu);
});

test("health fails readiness quickly when the database is unavailable", async () => {
  let finishCheck: (() => void) | undefined;
  const response = await handleHealthGet({
    checkDatabase: () => new Promise<void>((resolve) => {
      finishCheck = resolve;
    }),
    timeoutMs: 5,
  });

  assert.equal(response.status, 503);
  assert.equal((await response.json() as { database: string }).database, "unavailable");
  finishCheck?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
});

test("timed-out concurrent probes share one database check and clear it after late failure", async () => {
  let starts = 0;
  let rejectCheck: ((error: Error) => void) | undefined;
  const checkDatabase = () => {
    starts += 1;
    return new Promise((_, reject) => {
      rejectCheck = reject;
    });
  };
  const responses = await Promise.all(Array.from({ length: 3 }, () => handleHealthGet({
    checkDatabase,
    timeoutMs: 5,
  })));

  assert.deepEqual(responses.map(({ status }) => status), [503, 503, 503]);
  assert.equal(starts, 1);
  rejectCheck?.(new Error("late database failure"));
  await new Promise<void>((resolve) => setImmediate(resolve));

  const recovered = await handleHealthGet({
    checkDatabase: async () => {
      starts += 1;
      return 1;
    },
  });
  assert.equal(recovered.status, 200);
  assert.equal(starts, 2);
});

test("environment validation rejects missing required values without printing values", () => {
  assert.throws(() => validateEnvironment({}), /SESSION_SECRET is required/);
  assert.doesNotThrow(() => validateEnvironment({
    APP_URL: "http://localhost:3000",
    DATABASE_URL: "postgresql://user:password@localhost:5432/morsel",
    SESSION_SECRET: "x".repeat(32),
    CRAWLER_USER_AGENT: "MorselBot/1.0 (+https://example.com/bot)",
    FETCH_TIMEOUT_MS: "10000",
    FETCH_MAX_BYTES: "2000000",
    MANUAL_REFRESH_COOLDOWN_SECONDS: "300",
  }));
});

test("legal placeholders are present and clearly marked as drafts", async () => {
  const layout = await readFile(new URL("../app/legal/layout.tsx", import.meta.url), "utf8");
  const pages = await Promise.all([
    "terms", "privacy", "acceptable-use", "takedown",
  ].map((name) => readFile(new URL(`../app/legal/${name}/page.tsx`, import.meta.url), "utf8")));

  assert.match(layout, /Draft placeholder/);
  assert.match(layout, /not legal advice/);
  assert.ok(pages.every((page) => /<h1>/u.test(page)));
});
