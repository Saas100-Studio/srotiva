import { FeedSourceKind, FeedSourceType, WorkspaceRole } from "@prisma/client";

import { getDb } from "../src/lib/db/client.ts";

const db = getDb();

async function seed(): Promise<void> {
  const user = await db.user.upsert({
    where: { email: "developer@srotiva.local" },
    update: { name: "Srotiva Developer" },
    create: {
      email: "developer@srotiva.local",
      name: "Srotiva Developer",
      passwordHash: null,
    },
  });

  const workspace = await db.workspace.upsert({
    where: { slug: "development" },
    update: {
      name: "Development Workspace",
      ownerUserId: user.id,
    },
    create: {
      name: "Development Workspace",
      slug: "development",
      ownerUserId: user.id,
    },
  });

  await db.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: { role: WorkspaceRole.OWNER },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: WorkspaceRole.OWNER,
      joinedAt: new Date(),
    },
  });

  await db.feed.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: "example-feed",
      },
    },
    update: {
      name: "Example Feed",
      sourceUrl: "https://example.com/feed.xml",
    },
    create: {
      workspaceId: workspace.id,
      createdByUserId: user.id,
      name: "Example Feed",
      slug: "example-feed",
      sourceType: FeedSourceType.NATIVE,
      sourceUrl: "https://example.com/feed.xml",
      refreshIntervalMinutes: 60,
      sources: {
        create: {
          kind: FeedSourceKind.URL,
          url: "https://example.com/feed.xml",
        },
      },
    },
  });
}

try {
  await seed();
  console.log("Development database seeded.");
} finally {
  await db.$disconnect();
}
