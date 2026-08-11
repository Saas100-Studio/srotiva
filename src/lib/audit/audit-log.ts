import type { AuditLog, Prisma } from "@prisma/client";

import { getDb } from "../db/client.ts";

export type WriteAuditLogInput = {
  workspaceId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export type AuditLogClient = Pick<Prisma.TransactionClient, "auditLog">;

export function writeAuditLog({
  workspaceId,
  actorUserId,
  action,
  targetType,
  targetId,
  metadata = {},
}: WriteAuditLogInput, client: AuditLogClient = getDb()): Promise<AuditLog> {
  return client.auditLog.create({
    data: {
      workspaceId,
      actorUserId,
      action,
      targetType,
      targetId,
      metadata,
    },
  });
}
