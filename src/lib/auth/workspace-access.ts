import { WorkspaceRole, type WorkspaceMember } from "@prisma/client";

import { SrotivaApiError } from "../api/errors.ts";
import { findActiveWorkspaceMembership } from "../db/repositories/workspaces.ts";

export type WorkspaceAccessRole =
  | typeof WorkspaceRole.OWNER
  | typeof WorkspaceRole.EDITOR
  | typeof WorkspaceRole.VIEWER;

export type WorkspaceAccess = Pick<
  WorkspaceMember,
  "userId" | "workspaceId" | "role"
>;

export type RequireWorkspaceRoleInput = {
  userId: string;
  workspaceId: string;
  roles: readonly WorkspaceAccessRole[];
};

const ROLE_LEVEL: Record<WorkspaceAccessRole, number> = {
  [WorkspaceRole.OWNER]: 3,
  [WorkspaceRole.EDITOR]: 2,
  [WorkspaceRole.VIEWER]: 1,
};

function isWorkspaceAccessRole(role: WorkspaceRole): role is WorkspaceAccessRole {
  return role in ROLE_LEVEL;
}

export function hasWorkspaceRole(
  memberRole: WorkspaceRole,
  requiredRoles: readonly WorkspaceAccessRole[],
): boolean {
  if (!isWorkspaceAccessRole(memberRole)) {
    return false;
  }

  return requiredRoles.some(
    (requiredRole) => ROLE_LEVEL[memberRole] >= ROLE_LEVEL[requiredRole],
  );
}

function accessDenied(): SrotivaApiError {
  return new SrotivaApiError(
    403,
    "WORKSPACE_ACCESS_DENIED",
    "You do not have permission to access this workspace.",
  );
}

export async function requireWorkspaceRole({
  userId,
  workspaceId,
  roles,
}: RequireWorkspaceRoleInput): Promise<WorkspaceAccess> {
  if (roles.length === 0) {
    throw new TypeError("At least one workspace role is required.");
  }

  const membership = await findActiveWorkspaceMembership({
    userId,
    workspaceId,
  });

  if (!membership || !hasWorkspaceRole(membership.role, roles)) {
    throw accessDenied();
  }

  return membership;
}
