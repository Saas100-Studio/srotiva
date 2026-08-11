import { jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import { writeAuditLog } from "../../../../lib/audit/audit-log.ts";
import { getOptionalCurrentUser } from "../../../../lib/auth/current-user.ts";
import { clearSessionCookie } from "../../../../lib/auth/session.ts";

export async function POST(request: Request): Promise<Response> {
  try {
    const currentUser = await getOptionalCurrentUser(request);

    if (currentUser) {
      await writeAuditLog({
        workspaceId: currentUser.activeWorkspace.id,
        actorUserId: currentUser.user.id,
        action: "auth.logout",
        targetType: "user",
        targetId: currentUser.user.id,
        metadata: {},
      });
    }

    return jsonOk(
      { ok: true },
      { headers: { "set-cookie": clearSessionCookie() } },
    );
  } catch (error) {
    return jsonError(error, {
      headers: { "set-cookie": clearSessionCookie() },
    });
  }
}
