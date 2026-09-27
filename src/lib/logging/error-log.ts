import { ErrorSeverity, type Prisma } from "@prisma/client";

import { getDb } from "../db/client.ts";

export function writeErrorLog(input: {
  workspaceId?: string;
  feedId?: string;
  jobId?: string;
  source: string;
  code: string;
  message: string;
  details?: Record<string, string | number | boolean | null>;
}) {
  return getDb().errorLog.create({
    data: {
      workspaceId: input.workspaceId,
      feedId: input.feedId,
      jobId: input.jobId,
      severity: ErrorSeverity.ERROR,
      source: input.source,
      code: input.code,
      message: input.message,
      details: (input.details ?? {}) as Prisma.InputJsonValue,
    },
  });
}
