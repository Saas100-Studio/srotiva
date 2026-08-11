import assert from "node:assert/strict";
import test from "node:test";

import { POST as login } from "../app/api/auth/login/route.ts";
import { POST as logout } from "../app/api/auth/logout/route.ts";
import { POST as signup } from "../app/api/auth/signup/route.ts";
import { GET as getMe } from "../app/api/me/route.ts";
import { signup as signupAccount } from "../lib/auth/account.ts";
import { SESSION_COOKIE_NAME } from "../lib/auth/session.ts";
import { getDb } from "../lib/db/client.ts";

type ApiBody = {
  data?: {
    user: { id: string; email: string; name: string | null };
    activeWorkspace: { id: string; slug: string; role: string };
    workspaces: Array<{ id: string; slug: string; role: string }>;
  };
  error?: { code: string };
};

function jsonRequest(path: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function cookiePair(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "The response should set a session cookie.");
  const pair = setCookie.split(";", 1)[0];
  assert.ok(pair.startsWith(`${SESSION_COOKIE_NAME}=`));
  return pair;
}

test("auth routes create and authenticate an account", async (t) => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must be configured.");
  assert.ok(process.env.SESSION_SECRET, "SESSION_SECRET must be configured.");

  const db = getDb();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const email = `AUTH-${suffix}@MORSEL.TEST`;
  const normalizedEmail = email.toLowerCase();
  const password = "correct-horse-battery-staple";
  let userId = "";
  let workspaceId = "";
  let workspaceSlug = "";
  let collisionUserId = "";
  let collisionWorkspaceId = "";
  let sessionCookie = "";

  try {
    await t.test("signup creates a user, workspace, and owner membership", async () => {
      const response = await signup(
        jsonRequest("/api/auth/signup", {
          email,
          password,
          name: "Auth Test User",
        }),
      );
      const body = (await response.json()) as ApiBody;

      assert.equal(response.status, 201);
      assert.equal(body.data?.user.email, normalizedEmail);
      assert.equal(body.data?.activeWorkspace.role, "OWNER");
      assert.equal(body.data?.workspaces.length, 1);
      assert.match(body.data?.activeWorkspace.slug ?? "", /^auth-/);
      assert.doesNotMatch(JSON.stringify(body), /password|argon2/i);

      userId = body.data?.user.id ?? "";
      workspaceId = body.data?.activeWorkspace.id ?? "";
      workspaceSlug = body.data?.activeWorkspace.slug ?? "";
      sessionCookie = cookiePair(response);

      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      const storedUser = await db.user.findUnique({ where: { id: userId } });

      assert.equal(membership?.role, "OWNER");
      assert.ok(storedUser?.passwordHash);
      assert.notEqual(storedUser?.passwordHash, password);
    });

    await t.test("signup handles an existing default workspace slug", async () => {
      const response = await signup(
        jsonRequest("/api/auth/signup", {
          email: `${email.split("@")[0]}@example.test`,
          password,
          name: "Slug Collision User",
        }),
      );
      const body = (await response.json()) as ApiBody;
      const collisionSlug = body.data?.activeWorkspace.slug ?? "";

      assert.equal(response.status, 201);
      assert.notEqual(collisionSlug, workspaceSlug);
      assert.match(collisionSlug, new RegExp(`^${workspaceSlug}-[0-9a-f]{12}$`));
      assert.equal(body.data?.activeWorkspace.role, "OWNER");

      collisionUserId = body.data?.user.id ?? "";
      collisionWorkspaceId = body.data?.activeWorkspace.id ?? "";
    });

    await t.test("duplicate signup returns EMAIL_TAKEN", async () => {
      const response = await signup(
        jsonRequest("/api/auth/signup", {
          email: normalizedEmail,
          password,
          name: "Duplicate User",
        }),
      );
      const body = (await response.json()) as ApiBody;

      assert.equal(response.status, 409);
      assert.equal(body.error?.code, "EMAIL_TAKEN");
    });

    await t.test("signup rolls back when its audit write fails", async () => {
      const rollbackEmail = `rollback-${suffix}@morsel.test`;

      await assert.rejects(
        signupAccount(
          {
            email: rollbackEmail,
            password,
            name: "Rollback Test User",
          },
          {
            writeAuditLog: async () => {
              throw new Error("Simulated audit failure.");
            },
          },
        ),
        /Simulated audit failure/,
      );

      assert.equal(
        await db.user.findUnique({ where: { email: rollbackEmail } }),
        null,
      );
    });

    await t.test("login rejects the wrong password", async () => {
      const response = await login(
        jsonRequest("/api/auth/login", {
          email: normalizedEmail,
          password: "incorrect-password",
        }),
      );
      const body = (await response.json()) as ApiBody;

      assert.equal(response.status, 401);
      assert.equal(body.error?.code, "INVALID_CREDENTIALS");
    });

    await t.test("login accepts a normalized email and updates last login", async () => {
      const response = await login(
        jsonRequest("/api/auth/login", {
          email,
          password,
        }),
      );

      assert.equal(response.status, 200);
      sessionCookie = cookiePair(response);
      assert.ok(
        (await db.user.findUnique({ where: { id: userId } }))?.lastLoginAt,
      );
    });

    await t.test("/api/me rejects a missing session", async () => {
      const response = await getMe(new Request("http://localhost:3000/api/me"));
      const body = (await response.json()) as ApiBody;

      assert.equal(response.status, 401);
      assert.equal(body.error?.code, "UNAUTHENTICATED");
    });

    await t.test("/api/me returns the user and workspaces for a valid session", async () => {
      const response = await getMe(
        new Request("http://localhost:3000/api/me", {
          headers: { cookie: sessionCookie },
        }),
      );
      const body = (await response.json()) as ApiBody;

      assert.equal(response.status, 200);
      assert.equal(body.data?.user.id, userId);
      assert.equal(body.data?.activeWorkspace.id, workspaceId);
      assert.equal(body.data?.workspaces[0]?.role, "OWNER");
    });

    await t.test("logout clears the session cookie", async () => {
      const response = await logout(
        new Request("http://localhost:3000/api/auth/logout", {
          method: "POST",
          headers: { cookie: sessionCookie },
        }),
      );
      const setCookie = response.headers.get("set-cookie") ?? "";

      assert.equal(response.status, 200);
      assert.match(setCookie, new RegExp(`^${SESSION_COOKIE_NAME}=;`));
      assert.match(setCookie, /Max-Age=0/);
    });

    await t.test("successful auth actions write audit logs", async () => {
      const auditLogs = await db.auditLog.findMany({
        where: { actorUserId: userId, workspaceId },
        select: { action: true, targetType: true, targetId: true, metadata: true },
      });

      assert.deepEqual(
        auditLogs.map(({ action }) => action).sort(),
        ["auth.login", "auth.logout", "auth.signup"],
      );
      for (const auditLog of auditLogs) {
        assert.equal(auditLog.targetType, "user");
        assert.equal(auditLog.targetId, userId);
      }
      assert.deepEqual(
        auditLogs.find(({ action }) => action === "auth.login")?.metadata,
        { authenticationMethod: "password" },
      );
    });
  } finally {
    const workspaceIds = [workspaceId, collisionWorkspaceId].filter(Boolean);
    if (workspaceIds.length > 0) {
      await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    }
    const userIds = [userId, collisionUserId].filter(Boolean);
    if (userIds.length > 0) {
      await db.auditLog.deleteMany({
        where: { actorUserId: { in: userIds } },
      });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await db.$disconnect();
  }
});
