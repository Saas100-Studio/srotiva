import { WorkspaceRole } from "@prisma/client";

import { SrotivaApiError } from "../../../../../lib/api/errors.ts";
import { readBoundedJsonBody } from "../../../../../lib/api/json-body.ts";
import { createRequestContext } from "../../../../../lib/api/request-context.ts";
import { createRequestId, jsonError, jsonOk } from "../../../../../lib/api/responses.ts";
import { requireWorkspaceRole } from "../../../../../lib/auth/workspace-access.ts";
import { requestManualRefresh } from "../../../../../lib/feed/manual-refresh-service.ts";
import { logError } from "../../../../../lib/logging/logger.ts";
import { enforceRateLimit } from "../../../../../lib/security/rate-limit.ts";

function routeError(error: unknown): unknown {
  if (!(error instanceof SrotivaApiError)) return error;
  if (error.code === "UNAUTHENTICATED") return new SrotivaApiError(401, "UNAUTHORIZED", "Authentication is required.");
  if (error.code === "WORKSPACE_ACCESS_DENIED") return new SrotivaApiError(403, "FORBIDDEN", "Workspace editor access is required.");
  return error;
}

export async function handleManualRefresh(request: Request, feedId: string): Promise<Response> {
  const requestId = createRequestId();
  let workspaceId: string | undefined;
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(feedId)) {
      throw new SrotivaApiError(422, "VALIDATION_ERROR", "feedId must be a UUID.");
    }
    const value = await readBoundedJsonBody(request);
    const requestedWorkspaceId = value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).workspaceId
      : undefined;
    if (typeof requestedWorkspaceId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedWorkspaceId)) {
      throw new SrotivaApiError(422, "VALIDATION_ERROR", "workspaceId must be a UUID.");
    }
    workspaceId = requestedWorkspaceId;

    const context = await createRequestContext(request);
    if (workspaceId !== context.workspace.id) {
      throw new SrotivaApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
    }
    await requireWorkspaceRole({
      userId: context.user.id,
      workspaceId,
      roles: [WorkspaceRole.EDITOR],
    });
    enforceRateLimit({
      bucket: "manual_refresh",
      key: `${workspaceId}:${feedId}`,
      limit: 10,
      windowMs: 60_000,
    });

    return jsonOk(await requestManualRefresh({
      workspaceId,
      feedId,
      actorUserId: context.user.id,
    }), { status: 202, requestId });
  } catch (error) {
    const responseError = routeError(error);
    logError(responseError, { event: "request_failed", requestId, route: "/api/feeds/[feedId]/refresh", feedId, workspaceId });
    return jsonError(responseError, { requestId });
  }
}

type Context = { params: Promise<{ feedId: string }> };
export async function POST(request: Request, context: Context) {
  return handleManualRefresh(request, (await context.params).feedId);
}
