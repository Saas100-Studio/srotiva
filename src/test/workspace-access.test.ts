import assert from "node:assert/strict";
import test from "node:test";

import { WorkspaceRole } from "@prisma/client";

import { MorselApiError } from "../lib/api/errors.ts";
import {
  createRequestContext,
  requireUser,
} from "../lib/api/request-context.ts";
import { createSessionCookie } from "../lib/auth/session.ts";
import { requireWorkspaceRole } from "../lib/auth/workspace-access.ts";
import { getDb } from "../lib/db/client.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";

async function assertAccessDenied(promise: Promise<unknown>): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof MorselApiError);
    assert.equal(error.status, 403);
    assert.equal(error.code, "WORKSPACE_ACCESS_DENIED");
    return true;
  });
}

test("workspace role authorization enforces tenant boundaries", async (t) => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must be configured.");
  assert.ok(process.env.SESSION_SECRET, "SESSION_SECRET must be configured.");

  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const userIds: string[] = [];
  const workspaceIds: string[] = [];

  try {
    const owner = await createUser({
      email: `access-owner-${suffix}@morsel.test`,
      passwordHash: "test-password-hash",
    });
    const editor = await createUser({
      email: `access-editor-${suffix}@morsel.test`,
      passwordHash: "test-password-hash",
    });
    const viewer = await createUser({
      email: `access-viewer-${suffix}@morsel.test`,
      passwordHash: "test-password-hash",
    });
    const outsider = await createUser({
      email: `access-outsider-${suffix}@morsel.test`,
      passwordHash: "test-password-hash",
    });
    userIds.push(owner.id, editor.id, viewer.id, outsider.id);

    const workspace = await createWorkspaceWithOwner({
      userId: owner.id,
      name: "Access Test Workspace",
      slug: `access-${suffix}`,
    });
    const outsiderWorkspace = await createWorkspaceWithOwner({
      userId: outsider.id,
      name: "Outsider Workspace",
      slug: `access-outsider-${suffix}`,
    });
    workspaceIds.push(workspace.id, outsiderWorkspace.id);

    await db.workspaceMember.createMany({
      data: [
        {
          workspaceId: workspace.id,
          userId: editor.id,
          role: WorkspaceRole.EDITOR,
          joinedAt: new Date(),
        },
        {
          workspaceId: workspace.id,
          userId: viewer.id,
          role: WorkspaceRole.VIEWER,
          joinedAt: new Date(),
        },
      ],
    });

    await t.test("owner satisfies owner, editor, and viewer checks", async () => {
      for (const role of [
        WorkspaceRole.OWNER,
        WorkspaceRole.EDITOR,
        WorkspaceRole.VIEWER,
      ] as const) {
        const access = await requireWorkspaceRole({
          userId: owner.id,
          workspaceId: workspace.id,
          roles: [role],
        });
        assert.equal(access.role, WorkspaceRole.OWNER);
      }
    });

    await t.test("editor satisfies editor and viewer checks only", async () => {
      for (const role of [WorkspaceRole.EDITOR, WorkspaceRole.VIEWER] as const) {
        const access = await requireWorkspaceRole({
          userId: editor.id,
          workspaceId: workspace.id,
          roles: [role],
        });
        assert.equal(access.role, WorkspaceRole.EDITOR);
      }

      await assertAccessDenied(
        requireWorkspaceRole({
          userId: editor.id,
          workspaceId: workspace.id,
          roles: [WorkspaceRole.OWNER],
        }),
      );
    });

    await t.test("viewer satisfies viewer checks only", async () => {
      const access = await requireWorkspaceRole({
        userId: viewer.id,
        workspaceId: workspace.id,
        roles: [WorkspaceRole.VIEWER],
      });
      assert.equal(access.role, WorkspaceRole.VIEWER);

      await assertAccessDenied(
        requireWorkspaceRole({
          userId: viewer.id,
          workspaceId: workspace.id,
          roles: [WorkspaceRole.EDITOR],
        }),
      );
    });

    await t.test("a user from another workspace cannot read or mutate", async () => {
      await assertAccessDenied(
        requireWorkspaceRole({
          userId: outsider.id,
          workspaceId: workspace.id,
          roles: [WorkspaceRole.VIEWER],
        }),
      );
      await assertAccessDenied(
        requireWorkspaceRole({
          userId: outsider.id,
          workspaceId: workspace.id,
          roles: [WorkspaceRole.EDITOR],
        }),
      );
    });

    await t.test("request context establishes the active workspace", async () => {
      const request = new Request("http://localhost:3000/api/example", {
        headers: { cookie: createSessionCookie(owner.id, { secure: false }) },
      });
      const user = await requireUser(request);
      const context = await createRequestContext(request);

      assert.equal(user.id, owner.id);
      assert.equal(context.user.id, owner.id);
      assert.equal(context.workspace.id, workspace.id);
      assert.equal(context.workspace.role, WorkspaceRole.OWNER);
    });
  } finally {
    await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
