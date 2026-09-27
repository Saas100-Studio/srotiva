import { MorselApiError } from "../../../../../lib/api/errors.ts";
import { createRequestContext } from "../../../../../lib/api/request-context.ts";
import { jsonError, jsonOk } from "../../../../../lib/api/responses.ts";
import { findFeedDetail, listFeedItems } from "../../../../../lib/db/repositories/feeds.ts";

function routeError(error: unknown): unknown {
  if (!(error instanceof MorselApiError)) return error;
  if (error.code === "UNAUTHENTICATED") return new MorselApiError(401, "UNAUTHORIZED", "Authentication is required.");
  if (error.code === "WORKSPACE_ACCESS_DENIED") return new MorselApiError(403, "FORBIDDEN", "Workspace access is required.");
  return error;
}

export async function handleFeedItemsGet(request: Request, feedId: string): Promise<Response> {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(feedId)) throw new MorselApiError(422, "VALIDATION_ERROR", "feedId must be a UUID.");
    const context = await createRequestContext(request);
    const params = new URL(request.url).searchParams;
    const workspaceId = params.get("workspaceId");
    if (!workspaceId) throw new MorselApiError(422, "VALIDATION_ERROR", "workspaceId is required.");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) throw new MorselApiError(422, "VALIDATION_ERROR", "workspaceId must be a UUID.");
    if (workspaceId !== context.workspace.id) throw new MorselApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
    if (!await findFeedDetail(workspaceId, feedId)) throw new MorselApiError(404, "NOT_FOUND", "Feed not found.");
    const rawLimit = params.get("limit") ?? "25";
    if (!/^\d+$/.test(rawLimit)) throw new MorselApiError(422, "VALIDATION_ERROR", "limit must be an integer from 1 to 100.");
    const limit = Number(rawLimit);
    if (limit < 1 || limit > 100) throw new MorselApiError(422, "VALIDATION_ERROR", "limit must be an integer from 1 to 100.");
    const cursor = params.get("cursor") ?? undefined;
    if (cursor && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor)) throw new MorselApiError(422, "INVALID_CURSOR", "The pagination cursor is invalid.");
    const result = await listFeedItems(workspaceId, feedId, limit, cursor);
    if (!result) throw new MorselApiError(422, "INVALID_CURSOR", "The pagination cursor is invalid.");
    return jsonOk(result);
  } catch (error) { return jsonError(routeError(error)); }
}

type Context = { params: Promise<{ feedId: string }> };
export async function GET(request: Request, context: Context) { return handleFeedItemsGet(request, (await context.params).feedId); }
