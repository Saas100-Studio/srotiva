import { jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import {
  login,
  parseAuthInput,
  readJsonBody,
} from "../../../../lib/auth/account.ts";
import { createSessionCookie } from "../../../../lib/auth/session.ts";
import { writeAuditLog } from "../../../../lib/audit/audit-log.ts";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = parseAuthInput(await readJsonBody(request), {
      requireName: false,
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
      headers: { "set-cookie": createSessionCookie(currentUser.user.id) },
    });
  } catch (error) {
    return jsonError(error);
  }
}
