import { WorkspaceRole, type Workspace } from "@prisma/client";

import { getDb } from "../client.ts";

export type CreateWorkspaceWithOwnerInput = {
  userId: string;
  name: string;
  slug: string;
};

export function createWorkspaceWithOwner({
  userId,
  name,
  slug,
}: CreateWorkspaceWithOwnerInput): Promise<Workspace> {
  return getDb().workspace.create({
    data: {
      name,
      slug,
      ownerUserId: userId,
      members: {
        create: {
          userId,
          role: WorkspaceRole.OWNER,
          joinedAt: new Date(),
        },
      },
    },
  });
}

export type FindWorkspaceMembershipInput = {
  userId: string;
  workspaceId: string;
};

export function findActiveWorkspaceMembership({
  userId,
  workspaceId,
}: FindWorkspaceMembershipInput) {
  return getDb().workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
      joinedAt: { not: null },
      workspace: { status: "ACTIVE" },
    },
    select: {
      userId: true,
      workspaceId: true,
      role: true,
    },
  });
}
