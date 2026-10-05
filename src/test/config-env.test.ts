import assert from "node:assert/strict";
import test from "node:test";

import { loadEnv } from "../lib/config/env.ts";

const validEnv = {
  APP_URL: "http://localhost:3000/",
  DATABASE_URL: "postgresql://srotiva:password@localhost:5432/srotiva",
  SESSION_SECRET: "a-secure-session-secret-with-32-chars",
  CRAWLER_USER_AGENT: "SrotivaBot/1.0 (+https://example.com/bot)",
  FETCH_TIMEOUT_MS: "10000",
  FETCH_MAX_BYTES: "2000000",
  MANUAL_REFRESH_COOLDOWN_SECONDS: "300",
  REQUEST_JSON_MAX_BYTES: "262144",
  WORKSPACE_FEED_LIMIT: "25",
  WORKSPACE_ITEM_LIMIT: "10000",
  WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT: "1000",
};

test("loads environment values and normalizes numeric limits", () => {
  const env = loadEnv(validEnv);

  assert.equal(env.APP_URL, "http://localhost:3000");
  assert.equal(env.FETCH_TIMEOUT_MS, 10_000);
  assert.equal(env.FETCH_MAX_BYTES, 2_000_000);
  assert.equal(env.MANUAL_REFRESH_COOLDOWN_SECONDS, 300);
  assert.equal(env.REQUEST_JSON_MAX_BYTES, 262_144);
  assert.equal(env.WORKSPACE_FEED_LIMIT, 25);
  assert.equal(env.WORKSPACE_ITEM_LIMIT, 10_000);
  assert.equal(env.WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT, 1_000);
});

test("applies safe quota defaults and rejects invalid configured values", () => {
  const defaults = loadEnv({
    ...validEnv,
    REQUEST_JSON_MAX_BYTES: undefined,
    WORKSPACE_FEED_LIMIT: undefined,
    WORKSPACE_ITEM_LIMIT: undefined,
    WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT: undefined,
  });
  assert.equal(defaults.REQUEST_JSON_MAX_BYTES, 262_144);
  assert.equal(defaults.WORKSPACE_FEED_LIMIT, 25);
  assert.equal(defaults.WORKSPACE_ITEM_LIMIT, 10_000);
  assert.equal(defaults.WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT, 1_000);
  assert.throws(() => loadEnv({ ...validEnv, WORKSPACE_ITEM_LIMIT: "0" }), /WORKSPACE_ITEM_LIMIT must be a positive integer/);
  assert.throws(() => loadEnv({ ...validEnv, REQUEST_JSON_MAX_BYTES: "2.5" }), /REQUEST_JSON_MAX_BYTES must be a positive integer/);
});

test("strips multiple trailing slashes from APP_URL", () => {
  const env = loadEnv({ ...validEnv, APP_URL: "https://example.com///" });

  assert.equal(env.APP_URL, "https://example.com");
});

test("throws when DATABASE_URL is missing", () => {
  const { DATABASE_URL: _databaseUrl, ...envWithoutDatabase } = validEnv;

  assert.throws(
    () => loadEnv(envWithoutDatabase),
    /DATABASE_URL is required/,
  );
});

test("throws when SESSION_SECRET is shorter than 32 characters", () => {
  assert.throws(
    () => loadEnv({ ...validEnv, SESSION_SECRET: "too-short" }),
    /SESSION_SECRET must be at least 32 characters/,
  );
});
