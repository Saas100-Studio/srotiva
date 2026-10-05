import { WorkspaceRole } from "@prisma/client";

import { SrotivaApiError } from "../../../../../../lib/api/errors.ts";
import { readBoundedJsonBody } from "../../../../../../lib/api/json-body.ts";
import { createRequestContext } from "../../../../../../lib/api/request-context.ts";
import { jsonError, jsonOk } from "../../../../../../lib/api/responses.ts";
import { requireWorkspaceRole } from "../../../../../../lib/auth/workspace-access.ts";
import { parseFilterInput, previewFilter } from "../../../../../../lib/feed/filter-service.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function routeError(error: unknown): unknown {
  if (!(error instanceof SrotivaApiError)) return error;
  if (error.code === "UNAUTHENTICATED") return new SrotivaApiError(401, "UNAUTHORIZED", "Authentication is required.");
  if (error.code === "WORKSPACE_ACCESS_DENIED") return new SrotivaApiError(403, "FORBIDDEN", "Workspace editor access is required.");
  return error;
}

export async function handleFilterPreview(request: Request, feedId: string): Promise<Response> {
  try {
    if (!UUID.test(feedId)) throw new SrotivaApiError(422, "VALIDATION_ERROR", "feedId must be a UUID.");
    const value = await readBoundedJsonBody(request);
    const { workspaceId, filter } = parseFilterInput(value);
    if (!UUID.test(workspaceId)) throw new SrotivaApiError(422, "VALIDATION_ERROR", "workspaceId must be a UUID.");
    const context = await createRequestContext(request);
    if (workspaceId !== context.workspace.id) throw new SrotivaApiError(403, "FORBIDDEN", "The active workspace does not match the request.");
    await requireWorkspaceRole({ userId: context.user.id, workspaceId, roles: [WorkspaceRole.EDITOR] });
    return jsonOk(await previewFilter(workspaceId, feedId, filter));
  } catch (error) {
    return jsonError(routeError(error));
  }
}

type Context = { params: Promise<{ feedId: string }> };
export async function POST(request: Request, context: Context) {
  return handleFilterPreview(request, (await context.params).feedId);
}
