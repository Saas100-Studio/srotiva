import type {
  FeedRefreshJob,
  RefreshJobStatus,
  RefreshTrigger,
} from "@prisma/client";

import { getDb } from "../client.ts";

export type CreateRefreshJobInput = {
  workspaceId: string;
  feedId: string;
  trigger: RefreshTrigger;
  status: RefreshJobStatus;
};

export function createRefreshJob({
  workspaceId,
  feedId,
  trigger,
  status,
}: CreateRefreshJobInput): Promise<FeedRefreshJob> {
  return getDb().feedRefreshJob.create({
    data: {
      workspaceId,
      feedId,
      trigger,
      status,
    },
  });
}

export function listRecentRefreshJobs(workspaceId: string, feedId: string, limit = 5) {
  return getDb().feedRefreshJob.findMany({
    where: { workspaceId, feedId },
    select: {
      id: true,
      status: true,
      trigger: true,
      itemsFound: true,
      itemsNew: true,
      errorMessage: true,
      createdAt: true,
      finishedAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
}
