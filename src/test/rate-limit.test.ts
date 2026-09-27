import assert from "node:assert/strict";
import test from "node:test";

import { handleLoginPost } from "../app/api/auth/login/route.ts";
import { handleDiscoverPost } from "../app/api/feeds/discover/route.ts";
import { GET as getRss } from "../app/f/[slug]/rss/route.ts";
import { MorselApiError } from "../lib/api/errors.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";
import { logError } from "../lib/logging/logger.ts";
import {
  checkRateLimit,
  RATE_LIMIT_BUCKET_CAPACITY,
  resetRateLimits,
} from "../lib/security/rate-limit.ts";

const preview = {
  sourceUrl: "https://example.com/feed.xml",
  sourceType: "native" as const,
  sourceFormat: "rss" as const,
  feedTitle: "Example",
  feedDescription: null,
  previewItems: [],
  warnings: [],
};

function request(path: string, body: object, ip: string, cookie?: string) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("fixed-window limiter resets deterministically", () => {
  resetRateLimits();
  assert.equal(checkRateLimit({ bucket: "test", key: "one", limit: 1, windowMs: 1_000, now: 1_000 }).allowed, true);
  assert.deepEqual(
    checkRateLimit({ bucket: "test", key: "one", limit: 1, windowMs: 1_000, now: 1_100 }),
    { allowed: false, retryAfterSeconds: 1 },
  );
  assert.equal(checkRateLimit({ bucket: "test", key: "one", limit: 1, windowMs: 1_000, now: 2_000 }).allowed, true);
});

test("limiter purges expired buckets and never evicts live limits at capacity", () => {
  resetRateLimits();
  assert.equal(checkRateLimit({ bucket: "capacity", key: "keep", limit: 2, windowMs: 10_000, now: 0 }).allowed, true);
  for (let index = 1; index < RATE_LIMIT_BUCKET_CAPACITY; index += 1) {
    checkRateLimit({ bucket: "capacity", key: String(index), limit: 1, windowMs: 1_000, now: 0 });
  }
  assert.equal(
    checkRateLimit({ bucket: "capacity", key: "blocked", limit: 1, windowMs: 1_000, now: 1 }).allowed,
    false,
  );
  assert.equal(checkRateLimit({ bucket: "capacity", key: "keep", limit: 2, windowMs: 10_000, now: 1 }).allowed, true);
  assert.equal(checkRateLimit({ bucket: "capacity", key: "after-purge", limit: 1, windowMs: 1_000, now: 1_000 }).allowed, true);
  resetRateLimits();
});

test("login, discovery, and public output routes return RATE_LIMITED", async (t) => {
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const user = await createUser({ email: `limits-${suffix}@morsel.test`, passwordHash: "hash" });
  const workspace = await createWorkspaceWithOwner({ userId: user.id, name: "Limits", slug: `limits-${suffix}` });
  const cookie = createSessionCookie(user.id, { secure: false });

  t.after(async () => {
    resetRateLimits();
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  });

  await t.test("login limits an IP and normalized email pair", async () => {
    resetRateLimits();
    const make = () => handleLoginPost(request("/api/auth/login", {
      email: "missing@morsel.test",
      password: "not-the-password",
    }, "203.0.113.10"));
    for (let index = 0; index < 5; index += 1) assert.equal((await make()).status, 401);
    const limited = await make();
    const body = await limited.json() as { error: { code: string } };
    assert.equal(limited.status, 429);
    assert.equal(body.error.code, "RATE_LIMITED");
    assert.equal(limited.headers.get("retry-after"), "900");
  });

  await t.test("discovery limits a user and workspace pair", async () => {
    resetRateLimits();
    const make = () => handleDiscoverPost(request("/api/feeds/discover", {
      workspaceId: workspace.id,
      url: "https://example.com/feed.xml",
    }, "203.0.113.11", cookie), { discoverFeedPreview: async () => preview });
    for (let index = 0; index < 20; index += 1) assert.equal((await make()).status, 200);
    const limited = await make();
    assert.equal(limited.status, 429);
    assert.equal((await limited.json() as { error: { code: string } }).error.code, "RATE_LIMITED");
  });

  await t.test("discovery failures are persisted without raw request data", async () => {
    resetRateLimits();
    const response = await handleDiscoverPost(request("/api/feeds/discover", {
      workspaceId: workspace.id,
      url: "https://example.com/private-query?token=secret",
    }, "203.0.113.12", cookie), {
      discoverFeedPreview: async () => {
        throw new MorselApiError(502, "FETCH_FAILED", "The source could not be fetched.");
      },
    });
    assert.equal(response.status, 502);
    const errorLog = await db.errorLog.findFirstOrThrow({
      where: { workspaceId: workspace.id, source: "feed_discovery" },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(errorLog.code, "FETCH_FAILED");
    assert.doesNotMatch(JSON.stringify(errorLog), /secret|private-query/u);
  });

  await t.test("public output rate limits before feed lookup and returns Retry-After", async () => {
    resetRateLimits();
    for (let index = 0; index < 60; index += 1) {
      checkRateLimit({ bucket: "public_output", key: "203.0.113.13:missing", limit: 60, windowMs: 60_000 });
    }
    const response = await getRss(new Request("http://localhost/f/missing/rss", {
      headers: { "x-forwarded-for": "203.0.113.13" },
    }), { params: Promise.resolve({ slug: "missing" }) });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
  });
});

test("structured error logs contain request IDs and error codes without secrets", () => {
  const lines: string[] = [];
  logError(new MorselApiError(500, "FETCH_FAILED", "token=secret password=secret"), {
    event: "request_failed",
    requestId: "request-123",
    route: "/safe-route",
  }, (line) => lines.push(line));
  const value = JSON.parse(lines[0]!) as Record<string, unknown>;
  assert.equal(value.requestId, "request-123");
  assert.equal(value.errorCode, "FETCH_FAILED");
  assert.doesNotMatch(lines[0]!, /password|token|secret/u);
});
