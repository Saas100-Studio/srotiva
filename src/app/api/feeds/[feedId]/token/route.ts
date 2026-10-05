import { FeedVisibility, WorkspaceRole } from "@prisma/client";

import { SrotivaApiError } from "../../../../../lib/api/errors.ts";
import { readBoundedJsonBody } from "../../../../../lib/api/json-body.ts";
import { createRequestContext } from "../../../../../lib/api/request-context.ts";
import { jsonError, jsonOk } from "../../../../../lib/api/responses.ts";
import { requireWorkspaceRole } from "../../../../../lib/auth/workspace-access.ts";
import { loadEnv } from "../../../../../lib/config/env.ts";
import { findFeedDetail, rotatePrivateFeedTokenHash } from "../../../../../lib/db/repositories/feeds.ts";
import { createRandomPrivateFeedToken, hashPrivateFeedToken } from "../../../../../lib/feed/feed-output-token.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function routeError(error: unknown): unknown {
  if (!(error instanceof SrotivaApiError)) return error;
  if (error.code === "UNAUTHENTICATED") return new SrotivaApiError(401, "UNAUTHORIZED", "Authentication is required.");
  if (error.code === "WORKSPACE_ACCESS_DENIED") return new SrotivaApiError(403, "FORBIDDEN", "Workspace editor access is required.");
  return error;
}

export async function handlePrivateFeedTokenPost(request: Request, feedId: string): Promise<Response> {
  try {
    if (!UUID.test(feedId)) throw new SrotivaApiError(422, "VALIDATION_ERROR", "feedId must be a UUID.");
    const context = await createRequestContext(request);
    const value = await readBoundedJsonBody(request);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new SrotivaApiError(422, "VALIDATION_ERROR", "The request body must be an object.");
    }
    const body = value as Record<string, unknown>;
    if (Object.keys(body).length !== 1 || typeof body.workspaceId !== "string" || !UUID.test(body.workspaceId)) {
      throw new SrotivaApiError(422, "VALIDATION_ERROR", "workspaceId is required and must be a UUID.");
    }
    if (body.workspaceId !== context.workspace.id) {
      throw new SrotivaApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
    }
    await requireWorkspaceRole({
      userId: context.user.id,
      workspaceId: body.workspaceId,
      roles: [WorkspaceRole.EDITOR],
    });
    const feed = await findFeedDetail(body.workspaceId, feedId);
    if (!feed) throw new SrotivaApiError(404, "NOT_FOUND", "Feed not found.");
    if (feed.visibility !== FeedVisibility.PRIVATE) {
      throw new SrotivaApiError(409, "FEED_NOT_PRIVATE", "Only private feeds have access tokens.");
    }

    const token = createRandomPrivateFeedToken();
    if (!await rotatePrivateFeedTokenHash(body.workspaceId, feedId, hashPrivateFeedToken(token))) {
      throw new SrotivaApiError(409, "FEED_CHANGED", "The feed changed before its token could be rotated. Try again.");
    }
    const encoded = encodeURIComponent(token);
    const base = `${loadEnv().APP_URL}/f/${feed.outputSlug}`;
    return jsonOk({
      outputUrls: {
        rss: `${base}/rss?token=${encoded}`,
        json: `${base}/json?token=${encoded}`,
        csv: `${base}/csv?token=${encoded}`,
      },
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return jsonError(routeError(error), { headers: { "cache-control": "private, no-store" } });
  }
}

type Context = { params: Promise<{ feedId: string }> };
export async function POST(request: Request, context: Context) {
  return handlePrivateFeedTokenPost(request, (await context.params).feedId);
}
