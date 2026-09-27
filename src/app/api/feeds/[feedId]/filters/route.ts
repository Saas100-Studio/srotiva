import { WorkspaceRole } from "@prisma/client";

import { MorselApiError } from "../../../../../lib/api/errors.ts";
import { createRequestContext } from "../../../../../lib/api/request-context.ts";
import { jsonError, jsonOk } from "../../../../../lib/api/responses.ts";
import { requireWorkspaceRole } from "../../../../../lib/auth/workspace-access.ts";
import { createFilter, listFilters, parseFilterInput } from "../../../../../lib/feed/filter-service.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function routeError(error: unknown): unknown {
  if (!(error instanceof MorselApiError)) return error;
  if (error.code === "UNAUTHENTICATED") return new MorselApiError(401, "UNAUTHORIZED", "Authentication is required.");
  if (error.code === "WORKSPACE_ACCESS_DENIED") return new MorselApiError(403, "FORBIDDEN", "Workspace access is required.");
  return error;
}

function validId(value: string, name: string): void {
  if (!UUID.test(value)) throw new MorselApiError(422, "VALIDATION_ERROR", `${name} must be a UUID.`);
}

async function access(request: Request, workspaceId: string, role: typeof WorkspaceRole.VIEWER | typeof WorkspaceRole.EDITOR) {
  validId(workspaceId, "workspaceId");
  const context = await createRequestContext(request);
  if (workspaceId !== context.workspace.id) throw new MorselApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
  await requireWorkspaceRole({ userId: context.user.id, workspaceId, roles: [role] });
  return context;
}

export async function handleFiltersGet(request: Request, feedId: string): Promise<Response> {
  try {
    validId(feedId, "feedId");
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");
    if (!workspaceId) throw new MorselApiError(422, "VALIDATION_ERROR", "workspaceId is required.");
    await access(request, workspaceId, WorkspaceRole.VIEWER);
    return jsonOk(await listFilters(workspaceId, feedId));
  } catch (error) {
    return jsonError(routeError(error));
  }
}

export async function handleFiltersPost(request: Request, feedId: string): Promise<Response> {
  try {
    validId(feedId, "feedId");
    const value: unknown = await request.json().catch(() => {
      throw new MorselApiError(422, "VALIDATION_ERROR", "The request body must be valid JSON.");
    });
    const { workspaceId, filter } = parseFilterInput(value);
    await access(request, workspaceId, WorkspaceRole.EDITOR);
    return jsonOk(await createFilter(workspaceId, feedId, filter), { status: 201 });
  } catch (error) {
    return jsonError(routeError(error));
  }
}

type Context = { params: Promise<{ feedId: string }> };
export async function GET(request: Request, context: Context) { return handleFiltersGet(request, (await context.params).feedId); }
export async function POST(request: Request, context: Context) { return handleFiltersPost(request, (await context.params).feedId); }
