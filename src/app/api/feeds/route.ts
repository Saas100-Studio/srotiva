import { WorkspaceRole } from "@prisma/client";

import { MorselApiError } from "../../../lib/api/errors.ts";
import { createRequestContext } from "../../../lib/api/request-context.ts";
import { jsonError, jsonOk } from "../../../lib/api/responses.ts";
import { requireWorkspaceRole } from "../../../lib/auth/workspace-access.ts";
import { findFeedDetail, listFeeds } from "../../../lib/db/repositories/feeds.ts";
import { parseSaveFeedInput, saveFeed } from "../../../lib/feed/feed-save-service.ts";

function routeError(error: unknown): unknown {
  if (!(error instanceof MorselApiError)) return error;
  if (error.code === "UNAUTHENTICATED") return new MorselApiError(401, "UNAUTHORIZED", "Authentication is required.");
  if (error.code === "WORKSPACE_ACCESS_DENIED") return new MorselApiError(403, "FORBIDDEN", "Workspace access is required.");
  return error;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await createRequestContext(request);
    const body: unknown = await request.json().catch(() => {
      throw new MorselApiError(422, "VALIDATION_ERROR", "The request body must be valid JSON.");
    });
    const input = parseSaveFeedInput(body);
    if (input.workspaceId !== context.workspace.id) throw new MorselApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
    await requireWorkspaceRole({ userId: context.user.id, workspaceId: input.workspaceId, roles: [WorkspaceRole.EDITOR] });
    const saved = await saveFeed(input, context.user.id);
    const feed = await findFeedDetail(input.workspaceId, saved.id);
    if (!feed) throw new MorselApiError(500, "INTERNAL_ERROR", "The saved feed could not be read.");
    return jsonOk({ ...feed, itemCount: feed._count.items, _count: undefined }, { status: 201 });
  } catch (error) {
    return jsonError(routeError(error));
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await createRequestContext(request);
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");
    if (!workspaceId) throw new MorselApiError(422, "VALIDATION_ERROR", "workspaceId is required.");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) throw new MorselApiError(422, "VALIDATION_ERROR", "workspaceId must be a UUID.");
    if (workspaceId !== context.workspace.id) throw new MorselApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
    return jsonOk(await listFeeds(workspaceId));
  } catch (error) {
    return jsonError(routeError(error));
  }
}
