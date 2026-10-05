import { createRequestId, jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import {
  login,
  parseAuthInput,
  readJsonBody,
} from "../../../../lib/auth/account.ts";
import { createSessionCookie } from "../../../../lib/auth/session.ts";
import { writeAuditLog } from "../../../../lib/audit/audit-log.ts";
import { logError } from "../../../../lib/logging/logger.ts";
import { clientIp, enforceRateLimit } from "../../../../lib/security/rate-limit.ts";
import { assertTrustedMutationOrigin } from "../../../../lib/security/request-origin.ts";

export async function handleLoginPost(request: Request): Promise<Response> {
  const requestId = createRequestId();
  try {
    assertTrustedMutationOrigin(request);
    const input = parseAuthInput(await readJsonBody(request), {
      requireName: false,
    });
    enforceRateLimit({
      bucket: "login",
      key: `${clientIp(request)}:${input.email}`,
      limit: 5,
      windowMs: 15 * 60_000,
    });
    const currentUser = await login(input);
    await writeAuditLog({
      workspaceId: currentUser.activeWorkspace.id,
      actorUserId: currentUser.user.id,
      action: "auth.login",
      targetType: "user",
      targetId: currentUser.user.id,
      metadata: { authenticationMethod: "password" },
    });

    return jsonOk(currentUser, {
      requestId,
      headers: { "set-cookie": createSessionCookie(currentUser.user.id) },
    });
  } catch (error) {
    logError(error, { event: "request_failed", requestId, route: "/api/auth/login" });
    return jsonError(error, { requestId });
  }
}

export function POST(request: Request): Promise<Response> {
  return handleLoginPost(request);
}
