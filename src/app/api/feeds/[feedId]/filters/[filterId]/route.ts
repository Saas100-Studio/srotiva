import { WorkspaceRole } from "@prisma/client";

import { MorselApiError } from "../../../../../../lib/api/errors.ts";
import { createRequestContext } from "../../../../../../lib/api/request-context.ts";
import { jsonError, jsonOk } from "../../../../../../lib/api/responses.ts";
import { requireWorkspaceRole } from "../../../../../../lib/auth/workspace-access.ts";
import { deleteFilter, parseFilterPatch, updateFilter } from "../../../../../../lib/feed/filter-service.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function routeError(error: unknown): unknown {
  if (!(error instanceof MorselApiError)) return error;
  if (error.code === "UNAUTHENTICATED") return new MorselApiError(401, "UNAUTHORIZED", "Authentication is required.");
  if (error.code === "WORKSPACE_ACCESS_DENIED") return new MorselApiError(403, "FORBIDDEN", "Workspace editor access is required.");
  return error;
}

function validId(value: string, name: string): void {
  if (!UUID.test(value)) throw new MorselApiError(422, "VALIDATION_ERROR", `${name} must be a UUID.`);
}

async function access(request: Request, workspaceId: string): Promise<void> {
  validId(workspaceId, "workspaceId");
  const context = await createRequestContext(request);
  if (workspaceId !== context.workspace.id) throw new MorselApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
  await requireWorkspaceRole({ userId: context.user.id, workspaceId, roles: [WorkspaceRole.EDITOR] });
}

export async function handleFilterPatch(request: Request, feedId: string, filterId: string): Promise<Response> {
  try {
    validId(feedId, "feedId");
    validId(filterId, "filterId");
    const value: unknown = await request.json().catch(() => {
      throw new MorselApiError(422, "VALIDATION_ERROR", "The request body must be valid JSON.");
    });
    const { workspaceId, patch } = parseFilterPatch(value);
    await access(request, workspaceId);
    return jsonOk(await updateFilter(workspaceId, feedId, filterId, patch));
  } catch (error) {
    return jsonError(routeError(error));
  }
}

export async function handleFilterDelete(request: Request, feedId: string, filterId: string): Promise<Response> {
  try {
    validId(feedId, "feedId");
    validId(filterId, "filterId");
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");
    if (!workspaceId) throw new MorselApiError(422, "VALIDATION_ERROR", "workspaceId is required.");
    await access(request, workspaceId);
    return jsonOk(await deleteFilter(workspaceId, feedId, filterId));
  } catch (error) {
    return jsonError(routeError(error));
  }
}

type Context = { params: Promise<{ feedId: string; filterId: string }> };
export async function PATCH(request: Request, context: Context) {
  const params = await context.params;
  return handleFilterPatch(request, params.feedId, params.filterId);
}
export async function DELETE(request: Request, context: Context) {
  const params = await context.params;
  return handleFilterDelete(request, params.feedId, params.filterId);
}
