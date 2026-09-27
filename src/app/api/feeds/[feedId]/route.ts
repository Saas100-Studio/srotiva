import { FeedStatus, FeedVisibility, WorkspaceRole } from "@prisma/client";

import { MorselApiError } from "../../../../lib/api/errors.ts";
import { createRequestContext } from "../../../../lib/api/request-context.ts";
import { jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import { requireWorkspaceRole } from "../../../../lib/auth/workspace-access.ts";
import { loadEnv } from "../../../../lib/config/env.ts";
import { findFeedDetail, initializePrivateFeedToken, softDeleteFeed, updateFeed, type FeedPatch } from "../../../../lib/db/repositories/feeds.ts";
import { createPrivateFeedToken, hashPrivateFeedToken } from "../../../../lib/feed/feed-output-token.ts";

function routeError(error: unknown): unknown {
  if (!(error instanceof MorselApiError)) return error;
  if (error.code === "UNAUTHENTICATED") return new MorselApiError(401, "UNAUTHORIZED", "Authentication is required.");
  if (error.code === "WORKSPACE_ACCESS_DENIED") return new MorselApiError(403, "FORBIDDEN", "Workspace access is required.");
  return error;
}
function notFound(): MorselApiError { return new MorselApiError(404, "NOT_FOUND", "Feed not found."); }
function workspaceId(request: Request): string {
  const value = new URL(request.url).searchParams.get("workspaceId");
  if (!value) throw new MorselApiError(422, "VALIDATION_ERROR", "workspaceId is required.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new MorselApiError(422, "VALIDATION_ERROR", "workspaceId must be a UUID.");
  return value;
}
async function access(request: Request, role: typeof WorkspaceRole.EDITOR | typeof WorkspaceRole.VIEWER) {
  const context = await createRequestContext(request);
  const workspace = workspaceId(request);
  if (workspace !== context.workspace.id) throw new MorselApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
  await requireWorkspaceRole({ userId: context.user.id, workspaceId: workspace, roles: [role] });
  return workspace;
}
function validId(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
async function responseFeed(workspace: string, feed: NonNullable<Awaited<ReturnType<typeof findFeedDetail>>>) {
  const privateToken = feed.visibility === FeedVisibility.PRIVATE ? createPrivateFeedToken(feed.id) : null;
  if (privateToken) await initializePrivateFeedToken(workspace, feed.id, hashPrivateFeedToken(privateToken));
  const suffix = privateToken ? `?token=${encodeURIComponent(privateToken)}` : "";
  const base = `${loadEnv().APP_URL}/f/${feed.outputSlug}`;
  return {
    ...feed,
    itemCount: feed._count.items,
    _count: undefined,
    ...(privateToken ? { privateToken } : {}),
    outputUrls: { rss: `${base}/rss${suffix}`, json: `${base}/json${suffix}`, csv: `${base}/csv${suffix}` },
  };
}

export async function handleFeedGet(request: Request, feedId: string): Promise<Response> {
  try {
    if (!validId(feedId)) throw new MorselApiError(422, "VALIDATION_ERROR", "feedId must be a UUID.");
    const workspace = await access(request, WorkspaceRole.VIEWER);
    const feed = await findFeedDetail(workspace, feedId);
    if (!feed) throw notFound();
    return jsonOk(await responseFeed(workspace, feed));
  } catch (error) { return jsonError(routeError(error)); }
}

export async function handleFeedPatch(request: Request, feedId: string): Promise<Response> {
  try {
    if (!validId(feedId)) throw new MorselApiError(422, "VALIDATION_ERROR", "feedId must be a UUID.");
    const workspace = await access(request, WorkspaceRole.EDITOR);
    const value: unknown = await request.json().catch(() => { throw new MorselApiError(422, "VALIDATION_ERROR", "The request body must be valid JSON."); });
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new MorselApiError(422, "VALIDATION_ERROR", "The request body must be an object.");
    const body = value as Record<string, unknown>;
    const allowed = new Set(["name", "description", "visibility", "status"]);
    const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
    if (unexpected.length || !Object.keys(body).length) throw new MorselApiError(422, "VALIDATION_ERROR", "Only name, description, visibility, and status may be changed.", { unexpected });
    const patch: FeedPatch = {};
    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 500) throw new MorselApiError(422, "VALIDATION_ERROR", "name must be a non-empty string of at most 500 characters.");
      patch.name = body.name.trim();
    }
    if ("description" in body) {
      if (body.description !== null && (typeof body.description !== "string" || body.description.length > 20_000)) throw new MorselApiError(422, "VALIDATION_ERROR", "description must be null or a string of at most 20000 characters.");
      patch.description = typeof body.description === "string" ? body.description.trim() || null : null;
    }
    if ("visibility" in body) {
      if (![FeedVisibility.PUBLIC, FeedVisibility.PRIVATE, FeedVisibility.UNLISTED].includes(body.visibility as FeedVisibility)) throw new MorselApiError(422, "VALIDATION_ERROR", "visibility is invalid.");
      patch.visibility = body.visibility as FeedVisibility;
    }
    if ("status" in body) {
      if (body.status !== FeedStatus.ACTIVE && body.status !== FeedStatus.PAUSED) throw new MorselApiError(422, "VALIDATION_ERROR", "status must be active or paused.");
      patch.status = body.status as FeedStatus;
    }
    const feed = await updateFeed(workspace, feedId, patch);
    if (!feed) throw notFound();
    return jsonOk(await responseFeed(workspace, feed));
  } catch (error) { return jsonError(routeError(error)); }
}

export async function handleFeedDelete(request: Request, feedId: string): Promise<Response> {
  try {
    if (!validId(feedId)) throw new MorselApiError(422, "VALIDATION_ERROR", "feedId must be a UUID.");
    const workspace = await access(request, WorkspaceRole.EDITOR);
    if (!await softDeleteFeed(workspace, feedId)) throw notFound();
    return jsonOk({ deleted: true, id: feedId });
  } catch (error) { return jsonError(routeError(error)); }
}

type Context = { params: Promise<{ feedId: string }> };
export async function GET(request: Request, context: Context) { return handleFeedGet(request, (await context.params).feedId); }
export async function PATCH(request: Request, context: Context) { return handleFeedPatch(request, (await context.params).feedId); }
export async function DELETE(request: Request, context: Context) { return handleFeedDelete(request, (await context.params).feedId); }
