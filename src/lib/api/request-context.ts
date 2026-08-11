import { WorkspaceRole } from "@prisma/client";

import {
  requireCurrentUser,
  type AuthUser,
  type AuthWorkspace,
} from "../auth/current-user.ts";
import { requireWorkspaceRole } from "../auth/workspace-access.ts";

export type RequestContext = {
  user: AuthUser;
  workspace: AuthWorkspace;
};

export async function requireUser(request: Request): Promise<AuthUser> {
  return (await requireCurrentUser(request)).user;
}

export async function createRequestContext(
  request: Request,
): Promise<RequestContext> {
  const currentUser = await requireCurrentUser(request);
  const membership = await requireWorkspaceRole({
    userId: currentUser.user.id,
    workspaceId: currentUser.activeWorkspace.id,
    roles: [WorkspaceRole.VIEWER],
  });

  return {
    user: currentUser.user,
    workspace: {
      ...currentUser.activeWorkspace,
      role: membership.role,
    },
  };
}
