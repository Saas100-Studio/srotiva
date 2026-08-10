import { jsonOk } from "../../../../lib/api/responses.ts";
import { clearSessionCookie } from "../../../../lib/auth/session.ts";

export function POST(): Response {
  return jsonOk(
    { ok: true },
    { headers: { "set-cookie": clearSessionCookie() } },
  );
}
