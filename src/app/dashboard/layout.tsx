import { headers } from "next/headers";
import type { ReactNode } from "react";

import { AppShell } from "../../components/app-shell.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../lib/auth/current-user.ts";
import { requireDashboardUser } from "../../lib/auth/dashboard.ts";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const currentUser = requireDashboardUser(
    await getOptionalCurrentUserFromCookieHeader(requestHeaders.get("cookie")),
  );

  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
