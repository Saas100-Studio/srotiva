import { FeedItemStatus, WorkspaceRole } from "@prisma/client";

import { SrotivaApiError } from "../../../../../../lib/api/errors.ts";
import { requireUser } from "../../../../../../lib/api/request-context.ts";
import { createRequestId, jsonError, jsonOk } from "../../../../../../lib/api/responses.ts";
import { loadEnv } from "../../../../../../lib/config/env.ts";
import { getDb } from "../../../../../../lib/db/client.ts";
import { findActiveWorkspaceMembership } from "../../../../../../lib/db/repositories/workspaces.ts";
import { logError } from "../../../../../../lib/logging/logger.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateId(value: string | null, name: string): asserts value is string {
  if (!value || !UUID.test(value)) throw new SrotivaApiError(422, "VALIDATION_ERROR", `${name} must be a UUID.`);
}

function routeError(error: unknown): unknown {
  if (error instanceof SrotivaApiError && error.code === "UNAUTHENTICATED") {
    return new SrotivaApiError(401, "UNAUTHORIZED", "Authentication is required.");
  }
  return error;
}

export async function handleFeedDiagnosticsGet(request: Request, feedId: string): Promise<Response> {
  const requestId = createRequestId();
  let workspaceId: string | undefined;
  try {
    validateId(feedId, "feedId");
    const requestedWorkspaceId = new URL(request.url).searchParams.get("workspaceId");
    validateId(requestedWorkspaceId, "workspaceId");
    workspaceId = requestedWorkspaceId;
    const user = await requireUser(request);
    const membership = await findActiveWorkspaceMembership({ userId: user.id, workspaceId });
    if (membership?.role !== WorkspaceRole.SUPPORT) {
      throw new SrotivaApiError(403, "FORBIDDEN", "Support access is required.");
    }

    const db = getDb();
    const feed = await db.feed.findFirst({
      where: { id: feedId, workspaceId, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        visibility: true,
        sourceUrl: true,
        outputSlug: true,
        lastRefreshedAt: true,
        lastSuccessAt: true,
        lastFailureAt: true,
        failureCount: true,
      },
    });
    if (!feed) throw new SrotivaApiError(404, "FEED_NOT_FOUND", "The feed was not found.");

    const [lastRefreshJob, errorLogs, groupedCounts] = await Promise.all([
      db.feedRefreshJob.findFirst({
        where: { feedId, workspaceId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          trigger: true,
          status: true,
          attempt: true,
          itemsFound: true,
          itemsNew: true,
          itemsChanged: true,
          errorCode: true,
          errorMessage: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
        },
      }),
      db.errorLog.findMany({
        where: { feedId, workspaceId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, jobId: true, severity: true, source: true, code: true, message: true, createdAt: true },
      }),
      db.feedItem.groupBy({
        by: ["status"],
        where: { feedId, workspaceId },
        _count: { _all: true },
      }),
    ]);
    const itemCounts = Object.fromEntries(
      Object.values(FeedItemStatus).map((status) => [status.toLowerCase(), 0]),
    ) as Record<string, number>;
    for (const group of groupedCounts) itemCounts[group.status.toLowerCase()] = group._count._all;
    const base = `${loadEnv().APP_URL}/f/${feed.outputSlug}`;

    return jsonOk({
      feed: {
        id: feed.id,
        name: feed.name,
        status: feed.status,
        visibility: feed.visibility,
        sourceUrl: feed.sourceUrl,
        lastRefreshedAt: feed.lastRefreshedAt,
        lastSuccessAt: feed.lastSuccessAt,
        lastFailureAt: feed.lastFailureAt,
        failureCount: feed.failureCount,
      },
      lastRefreshJob,
      errorLogs,
      itemCounts,
      outputUrls: { rss: `${base}/rss`, json: `${base}/json`, csv: `${base}/csv` },
    }, { requestId });
  } catch (error) {
    const responseError = routeError(error);
    logError(responseError, {
      event: "request_failed",
      requestId,
      route: "/api/support/feeds/[feedId]/diagnostics",
      feedId,
      workspaceId,
    });
    return jsonError(responseError, { requestId });
  }
}

type Context = { params: Promise<{ feedId: string }> };
export async function GET(request: Request, context: Context): Promise<Response> {
  return handleFeedDiagnosticsGet(request, (await context.params).feedId);
}
