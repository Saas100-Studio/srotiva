import assert from "node:assert/strict";
import test from "node:test";

import { POST as signup } from "../app/api/auth/signup/route.ts";
import { handleDiscoverPost } from "../app/api/feeds/discover/route.ts";
import { handleFiltersPost } from "../app/api/feeds/[feedId]/filters/route.ts";
import { handleFeedItemsGet } from "../app/api/feeds/[feedId]/items/route.ts";
import { handleManualRefresh } from "../app/api/feeds/[feedId]/refresh/route.ts";
import { POST as saveFeed } from "../app/api/feeds/route.ts";
import { GET as getRss } from "../app/f/[slug]/rss/route.ts";
import { SESSION_COOKIE_NAME } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import type { FeedPreview } from "../lib/feed/feed-discovery-service.ts";
import { resetRateLimits } from "../lib/security/rate-limit.ts";

function jsonRequest(path: string, body: unknown, cookie?: string): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `smoke-${crypto.randomUUID()}`,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("MVP happy path reaches public output, refresh, and filters", async () => {
  assert.ok(process.env.DATABASE_URL);
  assert.ok(process.env.SESSION_SECRET);
  resetRateLimits();
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  let userId = "";
  let workspaceId = "";

  try {
    const signupResponse = await signup(jsonRequest("/api/auth/signup", {
      email: `smoke-${suffix}@morsel.test`,
      password: "correct-horse-battery-staple",
      name: "MVP Smoke",
    }));
    assert.equal(signupResponse.status, 201);
    const signupBody = await signupResponse.json() as { data: { user: { id: string }; activeWorkspace: { id: string } } };
    userId = signupBody.data.user.id;
    workspaceId = signupBody.data.activeWorkspace.id;
    const setCookie = signupResponse.headers.get("set-cookie") ?? "";
    const cookie = setCookie.split(";", 1)[0] ?? "";
    assert.ok(cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

    const preview: FeedPreview = {
      sourceUrl: "https://example.com/feed.xml",
      sourceType: "native",
      sourceFormat: "rss",
      feedTitle: "Smoke feed",
      feedDescription: "Fixture-backed smoke feed",
      previewItems: [{
        sourceItemId: "smoke-1",
        canonicalUrl: "https://example.com/posts/one",
        url: "https://example.com/posts/one",
        title: "Security release",
        descriptionText: "A fixture item",
        descriptionHtml: null,
        author: "Morsel",
        imageUrl: null,
        datePublished: new Date("2026-09-27T00:00:00.000Z"),
        dateModified: null,
        raw: {},
        fingerprint: "preview-only",
      }],
      warnings: [],
    };
    const discoveryResponse = await handleDiscoverPost(
      jsonRequest("/api/feeds/discover", { workspaceId, url: "https://example.com/feed.xml" }, cookie),
      { discoverFeedPreview: async () => preview },
    );
    assert.equal(discoveryResponse.status, 200);

    const saveResponse = await saveFeed(jsonRequest("/api/feeds", { workspaceId, ...preview }, cookie));
    assert.equal(saveResponse.status, 201);
    const saved = (await saveResponse.json() as { data: { id: string; outputSlug: string; privateToken: string } }).data;

    const itemsResponse = await handleFeedItemsGet(
      new Request(`http://localhost:3000/api/feeds/${saved.id}/items?workspaceId=${workspaceId}`, { headers: { cookie } }),
      saved.id,
    );
    assert.equal(itemsResponse.status, 200);
    assert.equal((await itemsResponse.json() as { data: { items: unknown[] } }).data.items.length, 1);

    const rssResponse = await getRss(
      new Request(`http://localhost:3000/f/${saved.outputSlug}/rss?token=${encodeURIComponent(saved.privateToken)}`, {
        headers: { "x-forwarded-for": `smoke-rss-${suffix}` },
      }),
      { params: Promise.resolve({ slug: saved.outputSlug }) },
    );
    assert.equal(rssResponse.status, 200);
    assert.match(await rssResponse.text(), /Security release/);

    const refreshResponse = await handleManualRefresh(
      jsonRequest(`/api/feeds/${saved.id}/refresh`, { workspaceId }, cookie),
      saved.id,
    );
    assert.equal(refreshResponse.status, 202);

    const filterResponse = await handleFiltersPost(
      jsonRequest(`/api/feeds/${saved.id}/filters`, {
        workspaceId,
        type: "whitelist",
        field: "title",
        keywords: ["security"],
      }, cookie),
      saved.id,
    );
    assert.equal(filterResponse.status, 201);
    assert.equal(await db.feedFilter.count({ where: { feedId: saved.id } }), 1);
  } finally {
    if (workspaceId) await db.workspace.deleteMany({ where: { id: workspaceId } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
  }
});
