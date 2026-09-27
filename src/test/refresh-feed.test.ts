import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { FeedSourceType, FeedStatus, RefreshTrigger } from "@prisma/client";

import { MorselApiError } from "../lib/api/errors.ts";
import { getDb } from "../lib/db/client.ts";
import { createFeed } from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";
import { refreshFeed } from "../lib/feed/refresh-feed.ts";

const rss = readFileSync(new URL("./fixtures/rss-basic.xml", import.meta.url), "utf8");
const html = readFileSync(new URL("./fixtures/html-card-grid.html", import.meta.url), "utf8");
const allowed = async () => true;
const response = (bodyText: string, contentType: string) => async (url: string | URL) => ({
  finalUrl: url.toString(),
  status: 200,
  headers: { etag: '"fixture"', "last-modified": "Mon, 01 Sep 2025 10:00:00 GMT" },
  contentType,
  bodyText,
  bytes: Buffer.byteLength(bodyText),
  durationMs: 12.4,
});

test("refresh pipeline inserts, deduplicates, updates, and preserves items on failure", async (t) => {
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const user = await createUser({ email: `refresh-${suffix}@morsel.test`, passwordHash: "test" });
  const workspace = await createWorkspaceWithOwner({
    userId: user.id,
    name: "Refresh Test",
    slug: `refresh-${suffix}`,
  });
  const native = await createFeed({
    workspaceId: workspace.id,
    createdByUserId: user.id,
    name: "Native",
    slug: `native-${suffix}`,
    sourceType: FeedSourceType.NATIVE,
    sourceUrl: "https://example.com/feed.xml",
    refreshIntervalMinutes: 60,
  });
  const webpage = await createFeed({
    workspaceId: workspace.id,
    createdByUserId: user.id,
    name: "Webpage",
    slug: `webpage-${suffix}`,
    sourceType: FeedSourceType.WEBPAGE,
    sourceUrl: "https://example.com/",
    refreshIntervalMinutes: 60,
  });
  await db.feed.updateMany({
    where: { id: { in: [native.id, webpage.id] } },
    data: { status: FeedStatus.ACTIVE },
  });

  t.after(async () => {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  });

  await t.test("native refresh is exactly deduplicated and updates changed content", async () => {
    const dependencies = {
      checkRobotsAllowed: allowed,
      getCrawlerUserAgent: () => "MorselTest/1.0",
      fetchDocument: response(rss, "application/rss+xml"),
    };
    const first = await refreshFeed({ feedId: native.id, trigger: RefreshTrigger.MANUAL }, dependencies);
    assert.deepEqual(first, { itemsFound: 1, itemsNew: 1, itemsChanged: 0 });

    const second = await refreshFeed({ feedId: native.id, trigger: RefreshTrigger.SCHEDULED }, dependencies);
    assert.deepEqual(second, { itemsFound: 1, itemsNew: 0, itemsChanged: 0 });

    const redirected = await refreshFeed(
      { feedId: native.id, trigger: RefreshTrigger.SCHEDULED },
      {
        ...dependencies,
        fetchDocument: async () => ({
          ...(await response(rss, "application/rss+xml")("https://cdn.example.com/current.xml")),
          finalUrl: "https://cdn.example.com/current.xml",
        }),
      },
    );
    assert.deepEqual(redirected, { itemsFound: 1, itemsNew: 0, itemsChanged: 0 });
    assert.equal(await db.feedItem.count({ where: { feedId: native.id } }), 1);

    const changedRss = rss.replace("First RSS item", "Updated RSS item");
    const changed = await refreshFeed(
      { feedId: native.id, trigger: RefreshTrigger.SCHEDULED },
      { ...dependencies, fetchDocument: response(changedRss, "application/rss+xml") },
    );
    assert.deepEqual(changed, { itemsFound: 1, itemsNew: 0, itemsChanged: 1 });
    const item = await db.feedItem.findFirstOrThrow({ where: { feedId: native.id } });
    assert.equal(item.title, "Updated RSS item");
  });

  await t.test("webpage refresh uses extraction and records degraded health warnings", async () => {
    const result = await refreshFeed(
      { feedId: webpage.id, trigger: RefreshTrigger.SCHEDULED },
      {
        checkRobotsAllowed: allowed,
        getCrawlerUserAgent: () => "MorselTest/1.0",
        fetchDocument: response(html, "text/html"),
      },
    );
    assert.deepEqual(result, { itemsFound: 3, itemsNew: 3, itemsChanged: 0 });
    const feed = await db.feed.findUniqueOrThrow({ where: { id: webpage.id } });
    assert.equal(feed.status, FeedStatus.DEGRADED);
  });

  await t.test("refresh checks robots policy before the source and its redirect", async () => {
    const checked: string[] = [];
    await refreshFeed(
      { feedId: native.id, trigger: RefreshTrigger.SCHEDULED },
      {
        checkRobotsAllowed: async ({ targetUrl }) => {
          checked.push(targetUrl.toString());
          return true;
        },
        getCrawlerUserAgent: () => "MorselTest/1.0",
        fetchDocument: async (url, options) => {
          await options?.beforeRedirect?.(new URL("https://example.com/redirected.xml"));
          return response(rss, "application/rss+xml")(url);
        },
      },
    );
    assert.deepEqual(checked, [
      "https://example.com/feed.xml",
      "https://example.com/redirected.xml",
    ]);
  });

  await t.test("failed fetch retains items, increments health, and writes an error log", async () => {
    const before = await db.feedItem.count({ where: { feedId: native.id } });
    await assert.rejects(
      refreshFeed(
        { feedId: native.id, trigger: RefreshTrigger.RETRY },
        {
          checkRobotsAllowed: allowed,
          getCrawlerUserAgent: () => "MorselTest/1.0",
          fetchDocument: async () => {
            throw new MorselApiError(502, "FETCH_HTTP_ERROR", "Upstream failed.", { status: 503 });
          },
        },
      ),
      { code: "FETCH_HTTP_ERROR" },
    );
    assert.equal(await db.feedItem.count({ where: { feedId: native.id } }), before);
    const failed = await db.feed.findUniqueOrThrow({ where: { id: native.id } });
    assert.equal(failed.status, FeedStatus.FAILED);
    assert.equal(failed.failureCount, 1);
    assert.ok(failed.lastFailureAt);
    const log = await db.errorLog.findFirstOrThrow({ where: { feedId: native.id } });
    assert.equal(log.code, "FETCH_HTTP_ERROR");

    await refreshFeed(
      { feedId: native.id, trigger: RefreshTrigger.RETRY },
      {
        checkRobotsAllowed: allowed,
        getCrawlerUserAgent: () => "MorselTest/1.0",
        fetchDocument: response(rss, "application/rss+xml"),
      },
    );
    const recovered = await db.feed.findUniqueOrThrow({ where: { id: native.id } });
    assert.equal(recovered.status, FeedStatus.ACTIVE);
    assert.equal(recovered.failureCount, 0);
    assert.ok(recovered.lastSuccessAt);
  });

  await t.test("paused feeds remain paused and are not fetched", async () => {
    await db.feed.update({ where: { id: native.id }, data: { status: FeedStatus.PAUSED } });
    let fetched = false;
    const before = await db.feedItem.count({ where: { feedId: native.id } });
    await assert.rejects(refreshFeed(
      { feedId: native.id, trigger: RefreshTrigger.SCHEDULED },
      {
        checkRobotsAllowed: allowed,
        getCrawlerUserAgent: () => "MorselTest/1.0",
        fetchDocument: async () => {
          fetched = true;
          return response(rss, "application/rss+xml")("https://example.com/feed.xml");
        },
      },
    ), { code: "FEED_NOT_REFRESHABLE" });
    assert.equal(fetched, false);
    assert.equal(await db.feedItem.count({ where: { feedId: native.id } }), before);
    assert.equal((await db.feed.findUniqueOrThrow({ where: { id: native.id } })).status, FeedStatus.PAUSED);
  });
});
