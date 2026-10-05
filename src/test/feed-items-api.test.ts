import assert from "node:assert/strict";
import test from "node:test";

import { POST as create } from "../app/api/feeds/route.ts";
import { handleFeedItemsGet } from "../app/api/feeds/[feedId]/items/route.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";

function request(url: string, cookie: string, method = "GET", body?: unknown) {
  return new Request(url, { method, headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const previewItem = (number: number, date: string | null = `2026-01-0${number}T00:00:00.000Z`) => ({
  sourceItemId: null, fingerprint: `ignored-${number}`, canonicalUrl: `https://items.test/${number}`,
  url: `https://items.test/${number}`, title: `Item ${number}`, descriptionText: null,
  descriptionHtml: null, author: null, imageUrl: null,
  datePublished: date, dateModified: null, raw: {},
});

test("feed items are cursor-paginated newest first and isolated by workspace", async () => {
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const user = await createUser({ email: `items-${suffix}@srotiva.test`, passwordHash: "hash" });
  const other = await createUser({ email: `items-other-${suffix}@srotiva.test`, passwordHash: "hash" });
  const workspace = await createWorkspaceWithOwner({ userId: user.id, name: "Items", slug: `items-${suffix}` });
  const otherWorkspace = await createWorkspaceWithOwner({ userId: other.id, name: "Other Items", slug: `items-other-${suffix}` });
  const cookie = createSessionCookie(user.id, { secure: false });
  try {
    const response = await create(request("http://localhost/api/feeds", cookie, "POST", {
      workspaceId: workspace.id, sourceUrl: "https://items.test/feed", sourceType: "native",
      sourceFormat: "atom", feedTitle: "Items", feedDescription: null,
      previewItems: [previewItem(1), previewItem(3), previewItem(2), previewItem(4, null)],
    }));
    const feedId = (await response.json() as { data: { id: string } }).data.id;
    const first = await handleFeedItemsGet(request(`http://localhost/api/feeds/${feedId}/items?workspaceId=${workspace.id}&limit=2`, cookie), feedId);
    const firstBody = await first.json() as { data: { items: Array<{ title: string }>; nextCursor: string } };
    assert.deepEqual(firstBody.data.items.map((item) => item.title), ["Item 3", "Item 2"]);
    assert.ok(firstBody.data.nextCursor);
    const second = await handleFeedItemsGet(request(`http://localhost/api/feeds/${feedId}/items?workspaceId=${workspace.id}&limit=2&cursor=${firstBody.data.nextCursor}`, cookie), feedId);
    assert.deepEqual((await second.json() as { data: { items: Array<{ title: string }> } }).data.items.map((item) => item.title), ["Item 1", "Item 4"]);
    assert.equal((await handleFeedItemsGet(request(`http://localhost/api/feeds/${feedId}/items?workspaceId=${workspace.id}&limit=0`, cookie), feedId)).status, 422);
    assert.equal((await handleFeedItemsGet(request(`http://localhost/api/feeds/${feedId}/items?workspaceId=${workspace.id}&cursor=bad`, cookie), feedId)).status, 422);
    const denied = await handleFeedItemsGet(request(`http://localhost/api/feeds/${feedId}/items?workspaceId=${otherWorkspace.id}`, cookie), feedId);
    assert.equal(denied.status, 403);
  } finally {
    await db.workspace.deleteMany({ where: { id: { in: [workspace.id, otherWorkspace.id] } } });
    await db.user.deleteMany({ where: { id: { in: [user.id, other.id] } } });
  }
});
