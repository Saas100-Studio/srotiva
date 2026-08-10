import { jsonError, jsonOk } from "../../../lib/api/responses.ts";
import { requireCurrentUser } from "../../../lib/auth/current-user.ts";

export async function GET(request: Request): Promise<Response> {
  try {
    return jsonOk(await requireCurrentUser(request));
  } catch (error) {
    return jsonError(error);
  }
}
