import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { SrotivaApiError } from "../lib/api/errors.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import type {
  FetchDocumentOptions,
  FetchDocumentResult,
} from "../lib/crawler/http-fetcher.ts";
import { getDb } from "../lib/db/client.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";
import {
  discoverFeedPreview,
  type FeedPreview,
} from "../lib/feed/feed-discovery-service.ts";
import { handleDiscoverPost } from "../app/api/feeds/discover/route.ts";

const fixture = (name: string) => readFile(
  new URL(`./fixtures/${name}`, import.meta.url),
  "utf8",
);

function document(url: string, bodyText: string, contentType = "text/html"): FetchDocumentResult {
  return {
    finalUrl: url,
    status: 200,
    headers: { "content-type": contentType },
    contentType,
    bodyText,
    bytes: Buffer.byteLength(bodyText),
    durationMs: 1,
  };
}

function request(
  workspaceId: string,
  cookie?: string,
): Request {
  return new Request("http://localhost:3000/api/feeds/discover", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ workspaceId, url: "https://example.com/blog" }),
  });
}

const preview: FeedPreview = {
  sourceUrl: "https://example.com/feed.xml",
  sourceType: "native",
  sourceFormat: "rss",
  feedTitle: "Example feed",
  feedDescription: null,
  previewItems: [],
  warnings: [],
};

test("discovery service recognizes a directly submitted native feed", async () => {
  const rss = await fixture("rss-basic.xml");
  let discoveryCalled = false;
  const result = await discoverFeedPreview(
    { url: "https://example.com/feed.xml" },
    {
      getCrawlerUserAgent: () => "SrotivaBot/1.0",
      checkRobotsAllowed: async () => true,
      fetchDocument: async () => document(
        "https://example.com/feed.xml",
        rss,
        "application/rss+xml",
      ),
      discoverNativeFeeds: async () => {
        discoveryCalled = true;
        return [];
      },
    },
  );

  assert.equal(discoveryCalled, false);
  assert.equal(result.sourceType, "native");
  assert.equal(result.sourceFormat, "rss");
  assert.ok(result.previewItems.length > 0);
});

test("discovery service prefers a native candidate and limits preview to ten", async () => {
  const html = await fixture("html-with-rss-link.html");
  const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>Native</title><description>News</description>${
    Array.from({ length: 12 }, (_, index) =>
      `<item><title>Item ${index}</title><link>https://example.com/${index}</link></item>`,
    ).join("")}</channel></rss>`;
  const fetched: string[] = [];
  const result = await discoverFeedPreview(
    { url: "https://example.com/blog" },
    {
      getCrawlerUserAgent: () => "SrotivaBot/1.0",
      checkRobotsAllowed: async () => true,
      discoverNativeFeeds: async () => [{
        url: "https://example.com/feed.xml",
        type: "rss",
        title: "Native",
        source: "alternate_link",
        confidence: 0.95,
      }],
      fetchDocument: async (value) => {
        const url = value.toString();
        fetched.push(url);
        return url.endsWith("feed.xml")
          ? document(url, rss, "application/rss+xml")
          : document(url, html);
      },
    },
  );

  assert.deepEqual(fetched, ["https://example.com/blog", "https://example.com/feed.xml"]);
  assert.equal(result.sourceType, "native");
  assert.equal(result.previewItems.length, 10);
});

test("discovery service falls back to HTML and checks redirect robots policy", async () => {
  const html = await fixture("html-article-list.html");
  const checked: string[] = [];
  const result = await discoverFeedPreview(
    { url: "https://example.com/start" },
    {
      getCrawlerUserAgent: () => "SrotivaBot/1.0",
      checkRobotsAllowed: async ({ targetUrl }) => {
        checked.push(targetUrl.toString());
        return true;
      },
      discoverNativeFeeds: async () => [],
      fetchDocument: async (_value, options?: FetchDocumentOptions) => {
        await options?.beforeRedirect?.(new URL("https://example.com/blog/"));
        return document("https://example.com/blog/", html);
      },
    },
  );

  assert.deepEqual(checked, ["https://example.com/start", "https://example.com/blog/"]);
  assert.equal(result.sourceType, "webpage");
  assert.equal(result.sourceFormat, "html");
  assert.equal(result.previewItems.length, 3);
});

test("discovery service maps unsafe and empty sources to stable errors", async () => {
  await assert.rejects(
    discoverFeedPreview(
      { url: "https://example.com" },
      {
        getCrawlerUserAgent: () => "SrotivaBot/1.0",
        checkRobotsAllowed: async () => {
          throw new SrotivaApiError(422, "UNSAFE_URL", "unsafe");
        },
      },
    ),
    (error: unknown) => error instanceof SrotivaApiError && error.code === "UNSAFE_URL",
  );

  await assert.rejects(
    discoverFeedPreview(
      { url: "https://example.com" },
      {
        getCrawlerUserAgent: () => "SrotivaBot/1.0",
        checkRobotsAllowed: async () => true,
        discoverNativeFeeds: async () => [],
        fetchDocument: async () => document("https://example.com/", "<html><p>Empty</p></html>"),
      },
    ),
    (error: unknown) => error instanceof SrotivaApiError && error.code === "NO_FEED_CANDIDATE",
  );
});

test("discover API authenticates the active workspace and writes no feed rows", async (t) => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must be configured.");
  assert.ok(process.env.SESSION_SECRET, "SESSION_SECRET must be configured.");

  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const user = await createUser({
    email: `discover-${suffix}@srotiva.test`,
    passwordHash: "test-password-hash",
  });
  const workspace = await createWorkspaceWithOwner({
    userId: user.id,
    name: "Discovery Test Workspace",
    slug: `discover-${suffix}`,
  });
  const cookie = createSessionCookie(user.id, { secure: false });
  let discoveryCalls = 0;

  try {
    await t.test("rejects an unauthenticated request", async () => {
      const response = await handleDiscoverPost(request(workspace.id), {
        discoverFeedPreview: async () => preview,
      });
      const body = await response.json() as { error?: { code: string } };
      assert.equal(response.status, 401);
      assert.equal(body.error?.code, "UNAUTHORIZED");
    });

    await t.test("rejects a request outside the active workspace", async () => {
      const response = await handleDiscoverPost(request(crypto.randomUUID(), cookie), {
        discoverFeedPreview: async () => {
          discoveryCalls += 1;
          return preview;
        },
      });
      const body = await response.json() as { error?: { code: string } };
      assert.equal(response.status, 403);
      assert.equal(body.error?.code, "FORBIDDEN");
      assert.equal(discoveryCalls, 0);
    });

    await t.test("rejects malformed and incomplete request bodies", async () => {
      const bodies = [
        "null",
        "[]",
        "{",
        JSON.stringify({ workspaceId: workspace.id }),
      ];
      for (const bodyText of bodies) {
        const response = await handleDiscoverPost(
          new Request("http://localhost:3000/api/feeds/discover", {
            method: "POST",
            headers: { "content-type": "application/json", cookie },
            body: bodyText,
          }),
          {
            discoverFeedPreview: async () => {
              discoveryCalls += 1;
              return preview;
            },
          },
        );
        const body = await response.json() as { error?: { code: string } };
        assert.equal(response.status, 422);
        assert.equal(body.error?.code, "INVALID_URL");
      }
      assert.equal(discoveryCalls, 0);
    });

    await t.test("returns the preview without persisting a feed", async () => {
      assert.equal(await db.feed.count({ where: { workspaceId: workspace.id } }), 0);
      const response = await handleDiscoverPost(request(workspace.id, cookie), {
        discoverFeedPreview: async () => {
          discoveryCalls += 1;
          return preview;
        },
      });
      const body = await response.json() as { data?: FeedPreview };
      assert.equal(response.status, 200);
      assert.equal(body.data?.sourceType, "native");
      assert.equal(discoveryCalls, 1);
      assert.equal(await db.feed.count({ where: { workspaceId: workspace.id } }), 0);
    });

    await t.test("returns the stable unsafe URL error envelope", async () => {
      const response = await handleDiscoverPost(request(workspace.id, cookie), {
        discoverFeedPreview: async () => {
          throw new SrotivaApiError(422, "UNSAFE_URL", "The URL is unsafe.");
        },
      });
      const body = await response.json() as { error?: { code: string } };
      assert.equal(response.status, 422);
      assert.equal(body.error?.code, "UNSAFE_URL");
    });
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
