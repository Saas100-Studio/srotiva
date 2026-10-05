import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canonicalRedirectUrl } from "./lib/config/app-url.ts";

export function proxy(request: NextRequest) {
  const redirectUrl = canonicalRedirectUrl(request.url);
  return redirectUrl ? NextResponse.redirect(redirectUrl, 308) : NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
