import { jsonError, jsonOk } from "../../../../lib/api/responses.ts";
import {
  parseAuthInput,
  readJsonBody,
  signup,
} from "../../../../lib/auth/account.ts";
import { createSessionCookie } from "../../../../lib/auth/session.ts";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = parseAuthInput(await readJsonBody(request), {
      requireName: true,
    });
    const currentUser = await signup(input);

    return jsonOk(currentUser, {
      status: 201,
      headers: { "set-cookie": createSessionCookie(currentUser.user.id) },
    });
  } catch (error) {
    return jsonError(error);
  }
}
