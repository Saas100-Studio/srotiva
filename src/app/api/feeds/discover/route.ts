import { MorselApiError } from "../../../../lib/api/errors.ts";
import { createRequestContext } from "../../../../lib/api/request-context.ts";
import { createRequestId, jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import { discoverFeedPreview } from "../../../../lib/feed/feed-discovery-service.ts";
import { writeErrorLog } from "../../../../lib/logging/error-log.ts";
import { logError } from "../../../../lib/logging/logger.ts";
import { enforceRateLimit } from "../../../../lib/security/rate-limit.ts";

type DiscoverRouteDependencies = {
  discoverFeedPreview?: typeof discoverFeedPreview;
  writeErrorLog?: typeof writeErrorLog;
};

function routeError(error: unknown): unknown {
  if (!(error instanceof MorselApiError)) return error;
  if (error.code === "UNAUTHENTICATED") {
    return new MorselApiError(401, "UNAUTHORIZED", "Authentication is required.");
  }
  if (error.code === "WORKSPACE_ACCESS_DENIED") {
    return new MorselApiError(403, "FORBIDDEN", "Workspace access is required.");
  }
  return error;
}

export async function handleDiscoverPost(
  request: Request,
  dependencies: DiscoverRouteDependencies = {},
): Promise<Response> {
  const requestId = createRequestId();
  let workspaceId: string | undefined;
  let discoveryStarted = false;
  try {
    const context = await createRequestContext(request);
    const value: unknown = await request.json().catch(() => {
      throw new MorselApiError(422, "INVALID_URL", "The request body must contain a valid URL.");
    });
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new MorselApiError(422, "INVALID_URL", "The request body must contain a valid URL.");
    }
    const body = value as Record<string, unknown>;
    if (
      typeof body.workspaceId !== "string" || !body.workspaceId ||
      typeof body.url !== "string" || !body.url.trim()
    ) {
      throw new MorselApiError(422, "INVALID_URL", "The request body must contain a valid URL.");
    }
    if (body.workspaceId !== context.workspace.id) {
      throw new MorselApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
    }
    workspaceId = context.workspace.id;
    enforceRateLimit({
      bucket: "feed_discovery",
      key: `${context.user.id}:${workspaceId}`,
      limit: 20,
      windowMs: 60_000,
    });
    discoveryStarted = true;
    return jsonOk(await (dependencies.discoverFeedPreview ?? discoverFeedPreview)({ url: body.url }), { requestId });
  } catch (error) {
    const responseError = routeError(error);
    if (discoveryStarted && workspaceId) {
      const apiError = responseError instanceof MorselApiError
        ? responseError
        : new MorselApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
      await (dependencies.writeErrorLog ?? writeErrorLog)({
        workspaceId,
        source: "feed_discovery",
        code: apiError.code,
        message: apiError.message,
        details: { requestId },
      }).catch((logFailure) => logError(logFailure, {
        event: "database_error_log_failed",
        requestId,
        route: "/api/feeds/discover",
        workspaceId,
      }));
    }
    logError(responseError, { event: "request_failed", requestId, route: "/api/feeds/discover", workspaceId });
    return jsonError(responseError, { requestId });
  }
}

export function POST(request: Request): Promise<Response> {
  return handleDiscoverPost(request);
}
