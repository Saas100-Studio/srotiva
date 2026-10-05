import assert from "node:assert/strict";
import test from "node:test";

import { writeAuditLog } from "../lib/audit/audit-log.ts";
import { getDb } from "../lib/db/client.ts";
import { createUser } from "../lib/db/repositories/users.ts";
import { createWorkspaceWithOwner } from "../lib/db/repositories/workspaces.ts";

test("audit helper writes the expected action and metadata", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must be configured.");

  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  let userId = "";
  let workspaceId = "";
  let auditLogId = "";

  try {
    const user = await createUser({
      email: `audit-${suffix}@srotiva.test`,
      passwordHash: "test-password-hash",
    });
    userId = user.id;
    const workspace = await createWorkspaceWithOwner({
      userId,
      name: "Audit Test Workspace",
      slug: `audit-${suffix}`,
    });
    workspaceId = workspace.id;

    const written = await writeAuditLog({
      workspaceId,
      actorUserId: userId,
      action: "feed.updated",
      targetType: "feed",
      targetId: crypto.randomUUID(),
      metadata: {
        changedFields: ["name", "refreshIntervalMinutes"],
        source: "test",
      },
    });
    auditLogId = written.id;

    const stored = await db.auditLog.findUnique({ where: { id: auditLogId } });
    assert.equal(stored?.workspaceId, workspaceId);
    assert.equal(stored?.actorUserId, userId);
    assert.equal(stored?.action, "feed.updated");
    assert.equal(stored?.targetType, "feed");
    assert.deepEqual(stored?.metadata, {
      changedFields: ["name", "refreshIntervalMinutes"],
      source: "test",
    });
  } finally {
    if (auditLogId) {
      await db.auditLog.deleteMany({ where: { id: auditLogId } });
    }
    if (workspaceId) {
      await db.workspace.deleteMany({ where: { id: workspaceId } });
    }
    if (userId) {
      await db.user.deleteMany({ where: { id: userId } });
    }
    await db.$disconnect();
  }
});
