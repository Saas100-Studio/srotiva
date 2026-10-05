import { createRequestId, jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import { createRequestContext } from "../../../../lib/api/request-context.ts";
import { exportAccountData } from "../../../../lib/auth/account-lifecycle.ts";
import { logError } from "../../../../lib/logging/logger.ts";

const PRIVATE_HEADERS = { "cache-control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const requestId = createRequestId();
  try {
    const context = await createRequestContext(request);
    const data = await exportAccountData(context.user.id, context.workspace.id);
    const date = new Date().toISOString().slice(0, 10);
    return jsonOk(data, {
      requestId,
      headers: {
        ...PRIVATE_HEADERS,
        "content-disposition": `attachment; filename="srotiva-account-export-${date}.json"`,
      },
    });
  } catch (error) {
    logError(error, { event: "request_failed", requestId, route: "/api/account/export" });
    return jsonError(error, { requestId, headers: PRIVATE_HEADERS });
  }
}
