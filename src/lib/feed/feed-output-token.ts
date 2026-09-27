import { createHash, createHmac } from "node:crypto";

import { loadEnv } from "../config/env.ts";

export function createPrivateFeedToken(feedId: string): string {
  return createHmac("sha256", loadEnv().SESSION_SECRET).update(feedId).digest("base64url");
}

export function hashPrivateFeedToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
