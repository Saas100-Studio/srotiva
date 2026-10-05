import assert from "node:assert/strict";
import test from "node:test";

import { DELETE as deleteAccount } from "../app/api/account/route.ts";
import { GET as exportAccount } from "../app/api/account/export/route.ts";
import { POST as changePassword } from "../app/api/account/password/route.ts";
import { POST as login } from "../app/api/auth/login/route.ts";
import { POST as signup } from "../app/api/auth/signup/route.ts";
import { SESSION_COOKIE_NAME } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";
import { resetRateLimits } from "../lib/security/rate-limit.ts";

type Envelope = {
  data?: Record<string, unknown>;
  error?: { code: string };
};

function request(
  path: string,
  method: "POST" | "DELETE",
  body: Record<string, unknown>,
  cookie?: string,
  origin = "http://localhost:3000",
): Request {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function cookiePair(response: Response): string {
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  return cookie.split(";", 1)[0] ?? "";
}

test("account settings support password change, export, and confirmed deletion", async (t) => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must be configured.");
  assert.ok(process.env.SESSION_SECRET, "SESSION_SECRET must be configured.");
  const previousAppUrl = process.env.APP_URL;
  process.env.APP_URL = "http://localhost:3000";
  resetRateLimits();
  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const email = `lifecycle-${suffix}@srotiva.test`;
  const password = "original-account-password";
  const newPassword = "new-account-password";
  let userId = "";
  let workspaceId = "";
  let cookie = "";

  try {
    const signupResponse = await signup(request("/api/auth/signup", "POST", {
      email,
      password,
      name: "Lifecycle Test",
    }));
    const signupBody = await signupResponse.json() as {
      data: { user: { id: string }; activeWorkspace: { id: string } };
    };
    assert.equal(signupResponse.status, 201);
    userId = signupBody.data.user.id;
    workspaceId = signupBody.data.activeWorkspace.id;
    cookie = cookiePair(signupResponse);

    await t.test("rejects a cross-origin password mutation", async () => {
      const response = await changePassword(request("/api/account/password", "POST", {
        currentPassword: password,
        newPassword,
      }, cookie, "https://attacker.example"));
      const body = await response.json() as Envelope;
      assert.equal(response.status, 403);
      assert.equal(body.error?.code, "INVALID_REQUEST_ORIGIN");
      assert.equal(response.headers.get("cache-control"), "no-store");
    });

    await t.test("verifies the current password", async () => {
      const response = await changePassword(request("/api/account/password", "POST", {
        currentPassword: "wrong-password",
        newPassword,
      }, cookie));
      const body = await response.json() as Envelope;
      assert.equal(response.status, 401);
      assert.equal(body.error?.code, "INVALID_CURRENT_PASSWORD");
      assert.equal(response.headers.get("cache-control"), "no-store");
    });

    await t.test("changes the password and renews the current cookie", async () => {
      const response = await changePassword(request("/api/account/password", "POST", {
        currentPassword: password,
        newPassword,
      }, cookie));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      cookie = cookiePair(response);

      const oldLogin = await login(request("/api/auth/login", "POST", { email, password }));
      assert.equal(oldLogin.status, 401);
      const newLogin = await login(request("/api/auth/login", "POST", { email, password: newPassword }));
      assert.equal(newLogin.status, 200);
    });

    await t.test("exports tenant-scoped data without credentials or bearer tokens", async () => {
      const response = await exportAccount(new Request("http://localhost:3000/api/account/export", {
        headers: { cookie },
      }));
      const serialized = await response.text();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match(response.headers.get("content-disposition") ?? "", /attachment/);
      assert.match(serialized, new RegExp(userId));
      assert.match(serialized, new RegExp(workspaceId));
      assert.doesNotMatch(serialized, /passwordHash|publicTokenHash|lockedBy|raw/);

      const exportAudit = await db.auditLog.findFirst({
        where: { actorUserId: userId, action: "account.data_exported" },
      });
      assert.ok(exportAudit);
    });

    await t.test("requires exact deletion confirmation", async () => {
      const response = await deleteAccount(request("/api/account", "DELETE", {
        password: newPassword,
        confirmation: "delete",
      }, cookie));
      const body = await response.json() as Envelope;
      assert.equal(response.status, 400);
      assert.equal(body.error?.code, "VALIDATION_ERROR");
      assert.ok(await db.user.findUnique({ where: { id: userId } }));
    });

    await t.test("refuses automatic deletion when another joined member exists", async () => {
      const member = await db.user.create({
        data: { email: `member-${suffix}@srotiva.test` },
        select: { id: true },
      });
      try {
        await db.workspaceMember.create({
          data: {
            workspaceId,
            userId: member.id,
            role: "VIEWER",
            joinedAt: new Date(),
          },
        });
        const response = await deleteAccount(request("/api/account", "DELETE", {
          password: newPassword,
          confirmation: "DELETE",
        }, cookie));
        const body = await response.json() as Envelope;
        assert.equal(response.status, 409);
        assert.equal(body.error?.code, "ACCOUNT_DELETION_REQUIRES_SUPPORT");
        assert.ok(await db.user.findUnique({ where: { id: userId } }));
      } finally {
        await db.workspaceMember.deleteMany({ where: { userId: member.id } });
        await db.user.delete({ where: { id: member.id } });
      }
    });

    await t.test("deletes the sole-owner account and workspace", async () => {
      const response = await deleteAccount(request("/api/account", "DELETE", {
        password: newPassword,
        confirmation: "DELETE",
      }, cookie));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`^${SESSION_COOKIE_NAME}=;`));
      assert.equal(await db.user.findUnique({ where: { id: userId } }), null);
      assert.equal(await db.workspace.findUnique({ where: { id: workspaceId } }), null);

      const deletionAudit = await db.auditLog.findFirst({
        where: { action: "account.deleted", targetId: userId },
      });
      assert.ok(deletionAudit);
      assert.equal(deletionAudit.actorUserId, null);
      assert.equal(deletionAudit.workspaceId, null);
    });
  } finally {
    if (workspaceId) await db.workspace.deleteMany({ where: { id: workspaceId } });
    if (userId) {
      await db.auditLog.deleteMany({ where: { targetId: userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
    await db.$disconnect();
  }
});
