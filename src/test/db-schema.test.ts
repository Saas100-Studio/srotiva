import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FeedFilterScope,
  FeedFilterType,
  FeedSourceType,
  Prisma,
  RefreshJobStatus,
  RefreshTrigger,
} from "@prisma/client";

import { getDb } from "../lib/db/client.ts";
import {
  createFeed,
  upsertFeedItem,
} from "../lib/db/repositories/feeds.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";
import { createRefreshJob } from "../lib/db/repositories/jobs.ts";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

test("MVP database schema constraints", async (t) => {
  assert.ok(
    process.env.DATABASE_URL,
    "DATABASE_URL must point to a migrated local test database.",
  );

  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const email = `schema-${suffix}@srotiva.test`;
  const workspaceSlug = `schema-${suffix}`;
  const secondWorkspaceSlug = `schema-second-${suffix}`;
  let userId = "";
  let workspaceId = "";
  let secondWorkspaceId = "";
  let feedId = "";

  try {
    await t.test("creates a user and owner workspace membership", async () => {
      const user = await createUser({
        email,
        passwordHash: "test-password-hash",
        name: "Schema Test User",
      });
      const workspace = await createWorkspaceWithOwner({
        userId: user.id,
        name: "Schema Test Workspace",
        slug: workspaceSlug,
      });

      userId = user.id;
      workspaceId = workspace.id;

      const membership = await db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });

      assert.equal(membership?.role, "OWNER");
    });

    await t.test("rejects a duplicate user email", async () => {
      await assert.rejects(
        createUser({
          email: email.toUpperCase(),
          passwordHash: "another-test-password-hash",
          name: "Duplicate User",
        }),
        isUniqueConstraintError,
      );
    });

    await t.test("rejects a duplicate feed slug in one workspace", async () => {
      const feed = await createFeed({
        workspaceId,
        createdByUserId: userId,
        name: "Schema Feed",
        slug: "shared-slug",
        sourceType: FeedSourceType.NATIVE,
        sourceUrl: "https://example.com/feed.xml",
        refreshIntervalMinutes: 60,
      });
      feedId = feed.id;

      await assert.rejects(
        createFeed({
          workspaceId,
          createdByUserId: userId,
          name: "Duplicate Schema Feed",
          slug: "shared-slug",
          sourceType: FeedSourceType.WEBPAGE,
          sourceUrl: "https://example.com/news",
          refreshIntervalMinutes: 120,
        }),
        isUniqueConstraintError,
      );
    });

    await t.test("allows the same feed slug in another workspace", async () => {
      const workspace = await createWorkspaceWithOwner({
        userId,
        name: "Second Schema Test Workspace",
        slug: secondWorkspaceSlug,
      });
      secondWorkspaceId = workspace.id;

      const feed = await createFeed({
        workspaceId: secondWorkspaceId,
        createdByUserId: userId,
        name: "Second Schema Feed",
        slug: "shared-slug",
        sourceType: FeedSourceType.NATIVE,
        sourceUrl: "https://example.org/feed.xml",
        refreshIntervalMinutes: 60,
      });

      assert.equal(feed.slug, "shared-slug");
      assert.equal(feed.workspaceId, secondWorkspaceId);
    });

    await t.test(
      "rejects feed-owned records assigned to another workspace",
      async () => {
        await assert.rejects(
          upsertFeedItem({
            workspaceId: secondWorkspaceId,
            feedId,
            item: {
              fingerprint: `cross-workspace-${suffix}`,
              title: "Cross-workspace item",
            },
          }),
          isForeignKeyConstraintError,
        );

        await assert.rejects(
          db.feedFilter.create({
            data: {
              workspaceId: secondWorkspaceId,
              feedId,
              scope: FeedFilterScope.FEED,
              type: FeedFilterType.BLACKLIST,
            },
          }),
          isForeignKeyConstraintError,
        );

        await assert.rejects(
          createRefreshJob({
            workspaceId: secondWorkspaceId,
            feedId,
            trigger: RefreshTrigger.MANUAL,
            status: RefreshJobStatus.QUEUED,
          }),
          isForeignKeyConstraintError,
        );
      },
    );

    await t.test(
      "rejects a duplicate item fingerprint inside one feed",
      async () => {
        const fingerprint = `fingerprint-${suffix}`;
        await upsertFeedItem({
          workspaceId,
          feedId,
          item: {
            fingerprint,
            title: "First item",
            url: "https://example.com/items/1",
          },
        });

        await assert.rejects(
          db.feedItem.create({
            data: {
              workspaceId,
              feedId,
              fingerprint,
              title: "Duplicate item",
            },
          }),
          isUniqueConstraintError,
        );
      },
    );
  } finally {
    if (workspaceId || secondWorkspaceId) {
      await db.workspace.deleteMany({
        where: { id: { in: [workspaceId, secondWorkspaceId].filter(Boolean) } },
      });
    }
    if (userId) {
      await db.user.delete({ where: { id: userId } });
    }
    await db.$disconnect();
  }
});
