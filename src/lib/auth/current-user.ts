import { MorselApiError } from "../api/errors.ts";
import { findUserWithActiveWorkspaceMembershipsById } from "../db/repositories/users.ts";
import {
  sessionTokenFromCookieHeader,
  verifySessionToken,
} from "./session.ts";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type AuthWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type CurrentUser = {
  user: AuthUser;
  activeWorkspace: AuthWorkspace;
  workspaces: AuthWorkspace[];
};

export async function findCurrentUserById(
  userId: string,
): Promise<CurrentUser | null> {
  const user = await findUserWithActiveWorkspaceMembershipsById(userId);

  if (!user || user.memberships.length === 0) {
    return null;
  }

  const workspaces = user.memberships.map(({ role, workspace }) => ({
    ...workspace,
    role,
  }));

  return {
    user: { id: user.id, email: user.email, name: user.name },
    activeWorkspace: workspaces[0],
    workspaces,
  };
}

export async function getOptionalCurrentUserFromCookieHeader(
  cookieHeader: string | null,
): Promise<CurrentUser | null> {
  const token = sessionTokenFromCookieHeader(cookieHeader);
  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);
  if (!session) {
    return null;
  }

  return findCurrentUserById(session.userId);
}

export function getOptionalCurrentUser(request: Request): Promise<CurrentUser | null> {
  return getOptionalCurrentUserFromCookieHeader(request.headers.get("cookie"));
}

export async function requireCurrentUser(
  request: Request,
): Promise<CurrentUser> {
  const currentUser = await getOptionalCurrentUser(request);

  if (!currentUser) {
    throw new MorselApiError(
      401,
      "UNAUTHENTICATED",
      "Authentication is required.",
    );
  }

  return currentUser;
}
