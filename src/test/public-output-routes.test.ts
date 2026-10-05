import assert from "node:assert/strict";
import test from "node:test";
import { XMLValidator } from "fast-xml-parser";

import { handleFeedGet } from "../app/api/feeds/[feedId]/route.ts";
import { handlePrivateFeedTokenPost } from "../app/api/feeds/[feedId]/token/route.ts";
import { POST as save } from "../app/api/feeds/route.ts";
import { GET as getCsv } from "../app/f/[slug]/csv/route.ts";
import { GET as getJson } from "../app/f/[slug]/json/route.ts";
import { GET as getRss } from "../app/f/[slug]/rss/route.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";
import { hashPrivateFeedToken } from "../lib/feed/feed-output-token.ts";

function route(get: typeof getRss, slug: string, token?: string) {
  const query = token === undefined ? "" : `?token=${encodeURIComponent(token)}`;
  return get(new Request(`http://untrusted-host.example/f/${slug}${query}`), { params: Promise.resolve({ slug }) });
}

test("public output routes enforce access and render one bounded active item set", async () => {
  assert.ok(process.env.APP_URL);
  assert.ok(process.env.DATABASE_URL);
  assert.ok(process.env.SESSION_SECRET);
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const user = await createUser({ email: `outputs-${suffix}@srotiva.test`, passwordHash: "hash" });
  const viewer = await createUser({ email: `outputs-viewer-${suffix}@srotiva.test`, passwordHash: "hash" });
  const workspace = await createWorkspaceWithOwner({ userId: user.id, name: "Outputs", slug: `outputs-${suffix}` });
  const cookie = createSessionCookie(user.id, { secure: false });
  const viewerCookie = createSessionCookie(viewer.id, { secure: false });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: viewer.id, role: "VIEWER", joinedAt: new Date() } });

  try {
    const response = await save(new Request("http://localhost/api/feeds", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: workspace.id,
        sourceUrl: "https://example.com/source.xml",
        sourceType: "native",
        sourceFormat: "rss",
        feedTitle: "Output Feed",
        feedDescription: "Output tests",
        previewItems: [
          { canonicalUrl: "https://example.com/three", title: "=SUM(A1:A2)", datePublished: "2026-03-01T00:00:00.000Z", raw: {} },
          { canonicalUrl: "https://example.com/two", title: "Two", datePublished: "2026-02-01T00:00:00.000Z", raw: {} },
          { canonicalUrl: "https://example.com/one", title: "One", datePublished: "2026-01-01T00:00:00.000Z", raw: {} },
          { canonicalUrl: "https://example.com/filtered", title: "Filtered", datePublished: "2026-04-01T00:00:00.000Z", raw: {} },
        ],
      }),
    }));
    assert.equal(response.status, 201);
    const body = await response.json() as { data: {
      id: string; outputSlug: string; privateToken: string;
      publicRssUrl: string; outputUrls: { rss: string; json: string; csv: string };
    } };
    const { id, outputSlug, privateToken, outputUrls } = body.data;
    assert.match(privateToken, /^[\w-]{43}$/u);
    assert.equal(outputUrls.rss, `${body.data.publicRssUrl}?token=${encodeURIComponent(privateToken)}`);
    assert.equal(outputUrls.json.includes(privateToken), true);
    assert.equal(outputUrls.csv.includes(privateToken), true);

    const stored = await db.feed.findUniqueOrThrow({ where: { id } });
    assert.notEqual(stored.publicTokenHash, privateToken);
    assert.doesNotMatch(stored.publicRssUrl ?? "", /token=/u);
    await db.feed.update({ where: { id }, data: { settings: { postLimit: 2 } } });
    await db.feedItem.updateMany({ where: { feedId: id, title: "Filtered" }, data: { status: "FILTERED" } });

    const missing = await route(getRss, outputSlug);
    const bad = await route(getRss, outputSlug, "wrong");
    const absent = await route(getRss, crypto.randomUUID());
    assert.equal(missing.status, 404);
    assert.equal(bad.status, 404);
    assert.equal(absent.status, 404);
    assert.equal(await missing.text(), await bad.text());
    assert.equal(await route(getRss, outputSlug).then((value) => value.text()), await absent.text());
    assert.equal(missing.headers.get("cache-control"), "private, no-store");
    assert.equal(missing.headers.get("x-robots-tag"), "noindex, nofollow, nosnippet");

    await db.feed.update({ where: { id }, data: { publicTokenHash: "malformed" } });
    assert.equal((await route(getRss, outputSlug, privateToken)).status, 404);
    await db.feed.update({ where: { id }, data: { publicTokenHash: stored.publicTokenHash } });
    const privateRss = await route(getRss, outputSlug, privateToken);
    assert.equal(privateRss.status, 200);
    assert.equal(privateRss.headers.get("cache-control"), "private, no-store");
    assert.doesNotMatch(await privateRss.text(), /token=/u);

    const rotationRequest = (rotationCookie: string) => new Request(`http://localhost/api/feeds/${id}/token`, {
      method: "POST",
      headers: { cookie: rotationCookie, "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace.id }),
    });
    assert.equal((await handlePrivateFeedTokenPost(rotationRequest(viewerCookie), id)).status, 403);
    const rotation = await handlePrivateFeedTokenPost(rotationRequest(cookie), id);
    const rotationBody = await rotation.json() as { data: { outputUrls: { rss: string; json: string; csv: string } } };
    const rotatedToken = new URL(rotationBody.data.outputUrls.rss).searchParams.get("token");
    assert.equal(rotation.status, 200);
    assert.equal(rotation.headers.get("cache-control"), "private, no-store");
    assert.match(rotatedToken ?? "", /^[\w-]{43}$/u);
    assert.equal((await db.feed.findUniqueOrThrow({ where: { id } })).publicTokenHash, hashPrivateFeedToken(rotatedToken ?? ""));
    assert.equal((await route(getRss, outputSlug, privateToken)).status, 404);
    assert.equal((await route(getRss, outputSlug, rotatedToken ?? "")).status, 200);
    const detailAfterRotation = await handleFeedGet(
      new Request(`http://localhost/api/feeds/${id}?workspaceId=${workspace.id}`, { headers: { cookie } }),
      id,
    );
    const detailAfterRotationBody = await detailAfterRotation.json() as { data: { privateToken?: string; outputUrls: { rss: string } } };
    assert.equal(detailAfterRotationBody.data.privateToken, undefined);
    assert.doesNotMatch(detailAfterRotationBody.data.outputUrls.rss, /token=/u);

    await db.feed.update({ where: { id }, data: { visibility: "PUBLIC" } });
    const [rss, json, csv] = await Promise.all([
      route(getRss, outputSlug),
      route(getJson, outputSlug),
      route(getCsv, outputSlug),
    ]);
    assert.equal(rss.headers.get("content-type"), "application/rss+xml; charset=utf-8");
    assert.equal(json.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(csv.headers.get("content-type"), "text/csv; charset=utf-8");
    for (const output of [rss, json, csv]) {
      assert.equal(output.status, 200);
      assert.equal(output.headers.get("cache-control"), "public, max-age=60, stale-while-revalidate=300");
      assert.equal(output.headers.get("x-robots-tag"), "noindex, nofollow, nosnippet");
    }
    const rssText = await rss.text();
    const jsonBody = await json.json() as { items: Array<{ fingerprint: string; title: string }> };
    const csvText = await csv.text();
    assert.equal(XMLValidator.validate(rssText), true);
    assert.match(rssText, new RegExp(`${process.env.APP_URL}/f/${outputSlug}/rss`));
    assert.doesNotMatch(rssText, /untrusted-host/u);
    assert.deepEqual(jsonBody.items.map((item) => item.title), ["=SUM(A1:A2)", "Two"]);
    assert.match(csvText, /'=SUM\(A1:A2\)/u);
    for (const item of jsonBody.items) {
      assert.match(rssText, new RegExp(item.fingerprint));
      assert.match(csvText, new RegExp(item.fingerprint));
    }
    assert.doesNotMatch(rssText, /Filtered/u);
    assert.doesNotMatch(csvText, /Filtered/u);

    await db.feed.update({ where: { id }, data: { visibility: "UNLISTED" } });
    assert.equal((await route(getJson, outputSlug)).status, 200);
    assert.equal((await route(getJson, outputSlug)).headers.get("cache-control"), "public, max-age=60, stale-while-revalidate=300");
    await db.feed.update({ where: { id }, data: { status: "DEGRADED" } });
    assert.equal((await route(getJson, outputSlug)).status, 200);
    await db.feed.update({ where: { id }, data: { status: "FAILED" } });
    assert.equal((await route(getRss, outputSlug)).status, 200);
    await db.feed.update({ where: { id }, data: { status: "ACTIVE" } });

    const legacy = await db.feed.create({
      data: {
        workspaceId: workspace.id,
        createdByUserId: user.id,
        name: "Legacy private feed",
        slug: `legacy-${suffix}`,
        status: "ACTIVE",
        visibility: "PRIVATE",
        sourceType: "NATIVE",
        sourceUrl: "https://example.com/legacy.xml",
        refreshIntervalMinutes: 1440,
      },
    });
    assert.equal(legacy.publicTokenHash, null);
    const legacyDetail = await handleFeedGet(
      new Request(`http://localhost/api/feeds/${legacy.id}?workspaceId=${workspace.id}`, { headers: { cookie } }),
      legacy.id,
    );
    const legacyBody = await legacyDetail.json() as { data: { privateToken: string; outputUrls: { rss: string } } };
    assert.equal(legacyDetail.status, 200);
    assert.match(legacyBody.data.outputUrls.rss, new RegExp(`^${process.env.APP_URL}/f/${legacy.outputSlug}/rss\\?token=`));
    assert.match((await db.feed.findUniqueOrThrow({ where: { id: legacy.id } })).publicTokenHash ?? "", /^[\da-f]{64}$/u);
    assert.equal((await route(getRss, legacy.outputSlug, legacyBody.data.privateToken)).status, 200);

    await db.feed.update({ where: { id }, data: { status: "PAUSED" } });
    assert.equal((await route(getJson, outputSlug)).status, 404);
    await db.feed.update({ where: { id }, data: { status: "ACTIVE", deletedAt: new Date() } });
    assert.equal((await route(getCsv, outputSlug)).status, 404);
  } finally {
    await db.workspace.deleteMany({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [user.id, viewer.id] } } });
  }
});

test("rotated private feed tokens are random and fixed-length", async () => {
  const { createRandomPrivateFeedToken } = await import("../lib/feed/feed-output-token.ts");
  const first = createRandomPrivateFeedToken();
  const second = createRandomPrivateFeedToken();
  assert.match(first, /^[\w-]{43}$/u);
  assert.match(second, /^[\w-]{43}$/u);
  assert.notEqual(first, second);
});
