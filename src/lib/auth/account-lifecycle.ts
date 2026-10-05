import { WorkspaceRole } from "@prisma/client";

import { SrotivaApiError } from "../api/errors.ts";
import { writeAuditLog } from "../audit/audit-log.ts";
import { getDb } from "../db/client.ts";
import { hashPassword, verifyPassword } from "./password.ts";

type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
};

function validationError(details: Record<string, string>): SrotivaApiError {
  return new SrotivaApiError(
    400,
    "VALIDATION_ERROR",
    "Check the submitted fields and try again.",
    details,
  );
}

export function parsePasswordChange(value: unknown): PasswordChangeInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError({ body: "A JSON object is required." });
  }

  const record = value as Record<string, unknown>;
  const currentPassword = typeof record.currentPassword === "string" ? record.currentPassword : "";
  const newPassword = typeof record.newPassword === "string" ? record.newPassword : "";
  const errors: Record<string, string> = {};

  if (!currentPassword || currentPassword.length > 128) {
    errors.currentPassword = "Enter your current password.";
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    errors.newPassword = "New password must be between 8 and 128 characters.";
  } else if (newPassword === currentPassword) {
    errors.newPassword = "Choose a password different from your current password.";
  }
  if (Object.keys(errors).length > 0) throw validationError(errors);

  return { currentPassword, newPassword };
}

export async function changePassword(input: {
  userId: string;
  workspaceId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw new SrotivaApiError(
      401,
      "INVALID_CURRENT_PASSWORD",
      "Your current password is incorrect.",
    );
  }

  const passwordHash = await hashPassword(input.newPassword);
  await db.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: input.userId },
      data: { passwordHash },
    });
    await writeAuditLog({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "account.password_changed",
      targetType: "user",
      targetId: input.userId,
      metadata: { authenticationMethod: "password" },
    }, transaction);
  });
}

export async function exportAccountData(userId: string, workspaceId: string) {
  const db = getDb();
  const [user, workspace, auditLogs] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        name: true,
        timezone: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.workspace.findFirst({
      where: {
        id: workspaceId,
        members: { some: { userId, joinedAt: { not: null } } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        members: {
          where: { userId },
          select: { role: true, joinedAt: true, createdAt: true },
        },
        feeds: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            status: true,
            visibility: true,
            sourceType: true,
            sourceUrl: true,
            refreshIntervalMinutes: true,
            lastRefreshedAt: true,
            lastSuccessAt: true,
            lastFailureAt: true,
            failureCount: true,
            settings: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            sources: {
              select: {
                id: true,
                kind: true,
                url: true,
                robotsStatus: true,
                lastHttpStatus: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            items: {
              select: {
                id: true,
                sourceItemId: true,
                canonicalUrl: true,
                url: true,
                title: true,
                descriptionText: true,
                author: true,
                authors: true,
                imageUrl: true,
                datePublished: true,
                dateModified: true,
                status: true,
                filterReason: true,
                isPinned: true,
                firstSeenAt: true,
                lastSeenAt: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            filters: {
              select: {
                id: true,
                scope: true,
                name: true,
                type: true,
                field: true,
                operator: true,
                value: true,
                isEnabled: true,
                orderIndex: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            refreshJobs: {
              select: {
                id: true,
                trigger: true,
                status: true,
                startedAt: true,
                finishedAt: true,
                attempt: true,
                itemsFound: true,
                itemsNew: true,
                itemsChanged: true,
                errorCode: true,
                errorMessage: true,
                createdAt: true,
              },
            },
          },
        },
      },
    }),
    db.auditLog.findMany({
      where: { actorUserId: userId, workspaceId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user || !workspace) {
    throw new SrotivaApiError(404, "ACCOUNT_NOT_FOUND", "Account data was not found.");
  }

  await writeAuditLog({
    workspaceId,
    actorUserId: userId,
    action: "account.data_exported",
    targetType: "user",
    targetId: userId,
  });

  return {
    exportedAt: new Date().toISOString(),
    account: user,
    workspace,
    auditLogs,
  };
}

export function parseAccountDeletion(value: unknown): { password: string; confirmation: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError({ body: "A JSON object is required." });
  }
  const record = value as Record<string, unknown>;
  const password = typeof record.password === "string" ? record.password : "";
  const confirmation = typeof record.confirmation === "string" ? record.confirmation : "";
  const errors: Record<string, string> = {};
  if (!password || password.length > 128) errors.password = "Enter your current password.";
  if (confirmation !== "DELETE") errors.confirmation = "Type DELETE exactly to confirm.";
  if (Object.keys(errors).length > 0) throw validationError(errors);
  return { password, confirmation };
}

export async function deleteSingleOwnerAccount(input: {
  userId: string;
  workspaceId: string;
  password: string;
}): Promise<void> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      passwordHash: true,
      memberships: { where: { joinedAt: { not: null } }, select: { workspaceId: true, role: true } },
      ownedWorkspaces: { select: { id: true } },
    },
  });
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new SrotivaApiError(401, "INVALID_CURRENT_PASSWORD", "Your current password is incorrect.");
  }

  const memberCount = await db.workspaceMember.count({
    where: { workspaceId: input.workspaceId, joinedAt: { not: null } },
  });
  const isSingleOwner =
    user.memberships.length === 1 &&
    user.memberships[0]?.workspaceId === input.workspaceId &&
    user.memberships[0]?.role === WorkspaceRole.OWNER &&
    user.ownedWorkspaces.length === 1 &&
    user.ownedWorkspaces[0]?.id === input.workspaceId &&
    memberCount === 1;
  if (!isSingleOwner) {
    throw new SrotivaApiError(
      409,
      "ACCOUNT_DELETION_REQUIRES_SUPPORT",
      "This account cannot be deleted automatically because it belongs to more than one user or workspace.",
    );
  }

  await db.$transaction(async (transaction) => {
    await writeAuditLog({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "account.deleted",
      targetType: "user",
      targetId: input.userId,
      metadata: { deletedWorkspaceId: input.workspaceId },
    }, transaction);
    await transaction.workspace.delete({ where: { id: input.workspaceId } });
    await transaction.user.delete({ where: { id: input.userId } });
  });
}
