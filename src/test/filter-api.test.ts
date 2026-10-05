import assert from "node:assert/strict";
import test from "node:test";

import { FeedSourceType } from "@prisma/client";

import { handleFilterDelete, handleFilterPatch } from "../app/api/feeds/[feedId]/filters/[filterId]/route.ts";
import { handleFiltersGet, handleFiltersPost } from "../app/api/feeds/[feedId]/filters/route.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import { createFeed } from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";

function request(url: string, cookie: string, method = "GET", body?: unknown) {
  return new Request(url, {
    method,
    headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("filter CRUD is tenant-safe, role-safe, and validates basic keyword rules", async () => {
  assert.ok(process.env.DATABASE_URL);
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const owner = await createUser({ email: `filters-owner-${suffix}@srotiva.test`, passwordHash: "hash" });
  const editor = await createUser({ email: `filters-editor-${suffix}@srotiva.test`, passwordHash: "hash" });
  const viewer = await createUser({ email: `filters-viewer-${suffix}@srotiva.test`, passwordHash: "hash" });
  const outsider = await createUser({ email: `filters-other-${suffix}@srotiva.test`, passwordHash: "hash" });
  const workspace = await createWorkspaceWithOwner({ userId: owner.id, name: "Filters", slug: `filters-${suffix}` });
  const otherWorkspace = await createWorkspaceWithOwner({ userId: outsider.id, name: "Other", slug: `filters-other-${suffix}` });
  await db.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: editor.id, role: "EDITOR", joinedAt: new Date() },
    { workspaceId: workspace.id, userId: viewer.id, role: "VIEWER", joinedAt: new Date() },
  ] });
  const feed = await createFeed({
    workspaceId: workspace.id,
    createdByUserId: owner.id,
    name: "Filter Feed",
    slug: `filter-feed-${suffix}`,
    sourceType: FeedSourceType.NATIVE,
    sourceUrl: "https://example.com/feed.xml",
    refreshIntervalMinutes: 60,
  });
  const editorCookie = createSessionCookie(editor.id, { secure: false });
  const viewerCookie = createSessionCookie(viewer.id, { secure: false });
  const outsiderCookie = createSessionCookie(outsider.id, { secure: false });

  try {
    const whitelistResponse = await handleFiltersPost(request("http://localhost/api/filters", editorCookie, "POST", {
      workspaceId: workspace.id,
      type: "whitelist",
      field: "title",
      keywords: [" security ", "SECURITY"],
      isEnabled: true,
    }), feed.id);
    assert.equal(whitelistResponse.status, 201);
    const whitelist = (await whitelistResponse.json() as { data: { id: string; type: string; field: string; keywords: string[]; isEnabled: boolean } }).data;
    assert.equal(whitelist.type, "whitelist");
    assert.equal(whitelist.field, "title");
    assert.deepEqual(whitelist.keywords, ["security"]);
    assert.equal(whitelist.isEnabled, true);

    const blacklistResponse = await handleFiltersPost(request("http://localhost/api/filters", editorCookie, "POST", {
      workspaceId: workspace.id,
      type: "blacklist",
      field: "any",
      keywords: ["sponsored"],
    }), feed.id);
    assert.equal(blacklistResponse.status, 201);
    const blacklist = (await blacklistResponse.json() as { data: { id: string; type: string } }).data;
    assert.equal(blacklist.type, "blacklist");

    const viewerList = await handleFiltersGet(request(
      `http://localhost/api/feeds/${feed.id}/filters?workspaceId=${workspace.id}`,
      viewerCookie,
    ), feed.id);
    assert.equal(viewerList.status, 200);
    assert.deepEqual(
      (await viewerList.json() as { data: Array<{ type: string }> }).data.map((filter) => filter.type),
      ["whitelist", "blacklist"],
    );

    const viewerCreate = await handleFiltersPost(request("http://localhost/api/filters", viewerCookie, "POST", {
      workspaceId: workspace.id,
      type: "blacklist",
      field: "any",
      keywords: ["denied"],
    }), feed.id);
    assert.equal(viewerCreate.status, 403);

    const crossTenantRead = await handleFiltersGet(request(
      `http://localhost/api/feeds/${feed.id}/filters?workspaceId=${workspace.id}`,
      outsiderCookie,
    ), feed.id);
    assert.equal(crossTenantRead.status, 403);
    const hiddenFeed = await handleFiltersGet(request(
      `http://localhost/api/feeds/${feed.id}/filters?workspaceId=${otherWorkspace.id}`,
      outsiderCookie,
    ), feed.id);
    assert.equal(hiddenFeed.status, 404);

    for (const invalid of [
      { type: "blacklist", field: "any", keywords: [""] },
      { type: "advanced", field: "any", keywords: ["x"] },
      { type: "blacklist", field: "source", keywords: ["x"] },
      { type: "blacklist", field: "any", keywords: ["x".repeat(81)] },
      { type: "blacklist", field: "any", keywords: Array.from({ length: 51 }, (_, index) => `x${index}`) },
    ]) {
      const response = await handleFiltersPost(request("http://localhost/api/filters", editorCookie, "POST", {
        workspaceId: workspace.id,
        ...invalid,
      }), feed.id);
      assert.equal(response.status, 422);
    }

    const patchResponse = await handleFilterPatch(request("http://localhost/api/filter", editorCookie, "PATCH", {
      workspaceId: workspace.id,
      keywords: ["advertisement"],
      isEnabled: false,
    }), feed.id, blacklist.id);
    assert.equal(patchResponse.status, 200);
    const patched = (await patchResponse.json() as { data: { keywords: string[]; isEnabled: boolean } }).data;
    assert.deepEqual(patched.keywords, ["advertisement"]);
    assert.equal(patched.isEnabled, false);

    const crossTenantPatch = await handleFilterPatch(request("http://localhost/api/filter", outsiderCookie, "PATCH", {
      workspaceId: otherWorkspace.id,
      isEnabled: false,
    }), feed.id, blacklist.id);
    assert.equal(crossTenantPatch.status, 404);

    const deleteResponse = await handleFilterDelete(request(
      `http://localhost/api/filter?workspaceId=${workspace.id}`,
      editorCookie,
      "DELETE",
    ), feed.id, whitelist.id);
    assert.equal(deleteResponse.status, 200);
    assert.equal(await db.feedFilter.count({ where: { id: whitelist.id } }), 0);
    assert.equal(await db.feedFilter.count({ where: { id: blacklist.id } }), 1);
  } finally {
    await db.workspace.deleteMany({ where: { id: { in: [workspace.id, otherWorkspace.id] } } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, editor.id, viewer.id, outsider.id] } } });
  }
});
