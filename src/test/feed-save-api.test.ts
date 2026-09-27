import assert from "node:assert/strict";
import test from "node:test";

import { GET as list, POST as create } from "../app/api/feeds/route.ts";
import { handleFeedDelete, handleFeedGet, handleFeedPatch } from "../app/api/feeds/[feedId]/route.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import { upsertFeedItem } from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";
import { createItemFingerprint } from "../lib/feed/fingerprint.ts";

const item = (url: string, date: string) => ({
  sourceItemId: null,
  fingerprint: "client-value-is-not-trusted",
  canonicalUrl: url,
  url,
  title: url.split("/").at(-1),
  descriptionText: "Description",
  descriptionHtml: null,
  author: null,
  imageUrl: null,
  datePublished: date,
  dateModified: null,
  raw: {},
});
function request(url: string, cookie: string, method = "GET", body?: unknown) {
  return new Request(url, {
    method,
    headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("feed save and management APIs preserve tenant boundaries and soft-delete rows", async () => {
  assert.ok(process.env.DATABASE_URL);
  assert.ok(process.env.SESSION_SECRET);
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const user = await createUser({ email: `save-${suffix}@morsel.test`, passwordHash: "hash" });
  const other = await createUser({ email: `save-other-${suffix}@morsel.test`, passwordHash: "hash" });
  const viewer = await createUser({ email: `save-viewer-${suffix}@morsel.test`, passwordHash: "hash" });
  const workspace = await createWorkspaceWithOwner({ userId: user.id, name: "Save", slug: `save-${suffix}` });
  const otherWorkspace = await createWorkspaceWithOwner({ userId: other.id, name: "Other", slug: `save-other-${suffix}` });
  const cookie = createSessionCookie(user.id, { secure: false });
  const otherCookie = createSessionCookie(other.id, { secure: false });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: viewer.id, role: "VIEWER", joinedAt: new Date() } });
  const viewerCookie = createSessionCookie(viewer.id, { secure: false });
  const nativeUrl = "https://example.com/feed.xml";

  try {
    const nativeResponse = await create(request("http://localhost/api/feeds", cookie, "POST", {
      workspaceId: workspace.id,
      sourceUrl: nativeUrl,
      sourceType: "native",
      sourceFormat: "rss",
      feedTitle: "Example Native",
      feedDescription: "News",
      previewItems: [
        item("https://example.com/one", "2026-01-01T00:00:00.000Z"),
        { ...item("https://example.com/one", "2026-01-01T00:00:00.000Z"), fingerprint: "another-client-value" },
      ],
      warnings: [],
    }));
    const nativeBody = await nativeResponse.json() as { data: { id: string; status: string; visibility: string; refreshIntervalMinutes: number } };
    assert.equal(nativeResponse.status, 201);
    assert.equal(nativeBody.data.status, "ACTIVE");
    assert.equal(nativeBody.data.visibility, "PRIVATE");
    assert.equal(nativeBody.data.refreshIntervalMinutes, 1440);

    const stored = await db.feedItem.findFirstOrThrow({ where: { feedId: nativeBody.data.id } });
    assert.equal(stored.fingerprint, createItemFingerprint({ feedUrl: nativeUrl, canonicalUrl: "https://example.com/one", title: "one", datePublished: "2026-01-01T00:00:00.000Z" }));

    const webpageResponse = await create(request("http://localhost/api/feeds", cookie, "POST", {
      workspaceId: workspace.id,
      sourceUrl: "https://example.com/blog",
      sourceType: "webpage",
      sourceFormat: "html",
      feedTitle: "Example Webpage",
      feedDescription: null,
      previewItems: [item("https://example.com/two", "2026-02-01T00:00:00.000Z")],
    }));
    assert.equal(webpageResponse.status, 201);
    const webpageId = (await webpageResponse.clone().json() as { data: { id: string } }).data.id;
    assert.equal(
      (await db.feedSource.findFirstOrThrow({ where: { feedId: webpageId } })).kind,
      "URL",
    );

    const denied = await create(request("http://localhost/api/feeds", cookie, "POST", {
      workspaceId: otherWorkspace.id, sourceUrl: nativeUrl, sourceType: "native",
      feedTitle: "Denied", previewItems: [],
    }));
    assert.equal(denied.status, 403);

    const otherResponse = await create(request("http://localhost/api/feeds", otherCookie, "POST", {
      workspaceId: otherWorkspace.id, sourceUrl: nativeUrl, sourceType: "native",
      feedTitle: "Invisible", previewItems: [],
    }));
    const otherFeedId = (await otherResponse.json() as { data: { id: string } }).data.id;
    const listResponse = await list(request(`http://localhost/api/feeds?workspaceId=${workspace.id}`, cookie));
    const listBody = await listResponse.json() as { data: Array<{ id: string }> };
    assert.equal(listBody.data.length, 2);
    assert.ok(!listBody.data.some((feed) => feed.id === otherFeedId));

    assert.equal((await list(request(`http://localhost/api/feeds?workspaceId=${workspace.id}`, viewerCookie))).status, 200);
    assert.equal((await create(request("http://localhost/api/feeds", viewerCookie, "POST", {
      workspaceId: workspace.id, sourceUrl: nativeUrl, sourceType: "native", feedTitle: "Viewer denied", previewItems: [],
    }))).status, 403);
    assert.equal((await handleFeedPatch(request(`http://localhost/api/feeds/${nativeBody.data.id}?workspaceId=${workspace.id}`, viewerCookie, "PATCH", { name: "No" }), nativeBody.data.id)).status, 403);
    assert.equal((await handleFeedDelete(request(`http://localhost/api/feeds/${nativeBody.data.id}?workspaceId=${workspace.id}`, viewerCookie, "DELETE"), nativeBody.data.id)).status, 403);

    const detailResponse = await handleFeedGet(request(`http://localhost/api/feeds/${nativeBody.data.id}?workspaceId=${workspace.id}`, cookie), nativeBody.data.id);
    const detailBody = await detailResponse.json() as { data: { itemCount: number; sources: Array<{ kind: string; url: string }> } };
    assert.equal(detailBody.data.itemCount, 1);
    assert.deepEqual(detailBody.data.sources.map(({ kind, url }) => ({ kind, url })), [{ kind: "RSS", url: nativeUrl }]);

    const patchResponse = await handleFeedPatch(request(`http://localhost/api/feeds/${nativeBody.data.id}?workspaceId=${workspace.id}`, cookie, "PATCH", { name: "Renamed", status: "PAUSED" }), nativeBody.data.id);
    assert.equal(patchResponse.status, 200);
    const patchBody = await patchResponse.json() as { data: Record<string, unknown> };
    assert.equal(patchBody.data.itemCount, 1);
    assert.equal("_count" in patchBody.data, false);
    const unsafePatch = await handleFeedPatch(request(`http://localhost/api/feeds/${nativeBody.data.id}?workspaceId=${workspace.id}`, cookie, "PATCH", { slug: "taken-over" }), nativeBody.data.id);
    assert.equal(unsafePatch.status, 422);

    await assert.rejects(upsertFeedItem({
      workspaceId: otherWorkspace.id,
      feedId: nativeBody.data.id,
      item: { fingerprint: stored.fingerprint, title: "Cross-workspace mutation" },
    }));
    assert.equal(
      (await db.feedItem.findUniqueOrThrow({ where: { id: stored.id } })).title,
      "one",
    );

    const deleteResponse = await handleFeedDelete(request(`http://localhost/api/feeds/${nativeBody.data.id}?workspaceId=${workspace.id}`, cookie, "DELETE"), nativeBody.data.id);
    assert.equal(deleteResponse.status, 200);
    assert.equal(await db.feed.count({ where: { id: nativeBody.data.id, status: "DELETED", deletedAt: { not: null } } }), 1);
    assert.equal(await db.feedItem.count({ where: { feedId: nativeBody.data.id } }), 1);
    const afterDelete = await list(request(`http://localhost/api/feeds?workspaceId=${workspace.id}`, cookie));
    assert.equal((await afterDelete.json() as { data: unknown[] }).data.length, 1);
  } finally {
    await db.workspace.deleteMany({ where: { id: { in: [workspace.id, otherWorkspace.id] } } });
    await db.user.deleteMany({ where: { id: { in: [user.id, other.id, viewer.id] } } });
  }
});

test("save validation rejects hostile preview fields and invalid dates", async () => {
  const { parseSaveFeedInput } = await import("../lib/feed/feed-save-service.ts");
  const base = { workspaceId: crypto.randomUUID(), sourceUrl: "https://example.com/feed", sourceType: "native", feedTitle: "Feed" };
  assert.throws(() => parseSaveFeedInput({ ...base, previewItems: [{ raw: {}, status: "ACTIVE" }] }), /unsupported fields/);
  assert.throws(() => parseSaveFeedInput({ ...base, previewItems: [{ raw: {}, datePublished: "not-a-date" }] }), /valid date/);
});
