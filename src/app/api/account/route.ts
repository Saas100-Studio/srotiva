import { createRequestId, jsonError, jsonOk } from "../../../lib/api/responses.ts";
import { createRequestContext } from "../../../lib/api/request-context.ts";
import { readJsonBody } from "../../../lib/auth/account.ts";
import { deleteSingleOwnerAccount, parseAccountDeletion } from "../../../lib/auth/account-lifecycle.ts";
import { clearSessionCookie } from "../../../lib/auth/session.ts";
import { logError } from "../../../lib/logging/logger.ts";

const PRIVATE_HEADERS = { "cache-control": "no-store" };

export async function DELETE(request: Request): Promise<Response> {
  const requestId = createRequestId();
  try {
    const context = await createRequestContext(request);
    const input = parseAccountDeletion(await readJsonBody(request));
    await deleteSingleOwnerAccount({
      userId: context.user.id,
      workspaceId: context.workspace.id,
      password: input.password,
    });
    return jsonOk(
      { deleted: true },
      {
        requestId,
        headers: {
          ...PRIVATE_HEADERS,
          "set-cookie": clearSessionCookie(),
        },
      },
    );
  } catch (error) {
    logError(error, { event: "request_failed", requestId, route: "/api/account" });
    return jsonError(error, { requestId, headers: PRIVATE_HEADERS });
  }
}
