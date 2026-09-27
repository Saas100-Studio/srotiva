import { createRequestId, jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import {
  parseAuthInput,
  readJsonBody,
  signup,
} from "../../../../lib/auth/account.ts";
import { createSessionCookie } from "../../../../lib/auth/session.ts";
import { logError } from "../../../../lib/logging/logger.ts";
import { clientIp, enforceRateLimit } from "../../../../lib/security/rate-limit.ts";

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();
  try {
    enforceRateLimit({
      bucket: "signup",
      key: clientIp(request),
      limit: 5,
      windowMs: 60 * 60_000,
    });
    const input = parseAuthInput(await readJsonBody(request), {
      requireName: true,
    });
    const currentUser = await signup(input);

    return jsonOk(currentUser, {
      status: 201,
      requestId,
      headers: { "set-cookie": createSessionCookie(currentUser.user.id) },
    });
  } catch (error) {
    logError(error, { event: "request_failed", requestId, route: "/api/auth/signup" });
    return jsonError(error, { requestId });
  }
}
