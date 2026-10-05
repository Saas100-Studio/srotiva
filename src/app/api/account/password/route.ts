import { createRequestId, jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import { createRequestContext } from "../../../../lib/api/request-context.ts";
import { readJsonBody } from "../../../../lib/auth/account.ts";
import { changePassword, parsePasswordChange } from "../../../../lib/auth/account-lifecycle.ts";
import { createSessionCookie } from "../../../../lib/auth/session.ts";
import { logError } from "../../../../lib/logging/logger.ts";

const PRIVATE_HEADERS = { "cache-control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();
  try {
    const context = await createRequestContext(request);
    const input = parsePasswordChange(await readJsonBody(request));
    await changePassword({
      userId: context.user.id,
      workspaceId: context.workspace.id,
      ...input,
    });
    return jsonOk(
      { changed: true },
      {
        requestId,
        headers: {
          ...PRIVATE_HEADERS,
          "set-cookie": createSessionCookie(context.user.id),
        },
      },
    );
  } catch (error) {
    logError(error, { event: "request_failed", requestId, route: "/api/account/password" });
    return jsonError(error, { requestId, headers: PRIVATE_HEADERS });
  }
}
