import { MorselApiError } from "../../../../lib/api/errors.ts";
import { createRequestContext } from "../../../../lib/api/request-context.ts";
import { jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import { discoverFeedPreview } from "../../../../lib/feed/feed-discovery-service.ts";

type DiscoverRouteDependencies = {
  discoverFeedPreview?: typeof discoverFeedPreview;
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
    return jsonOk(await (dependencies.discoverFeedPreview ?? discoverFeedPreview)({ url: body.url }));
  } catch (error) {
    return jsonError(routeError(error));
  }
}

export function POST(request: Request): Promise<Response> {
  return handleDiscoverPost(request);
}
