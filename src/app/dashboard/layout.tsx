import { headers } from "next/headers";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "../../components/app-shell.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../lib/auth/current-user.ts";
import { requireDashboardUser } from "../../lib/auth/dashboard.ts";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const currentUser = requireDashboardUser(
    await getOptionalCurrentUserFromCookieHeader(requestHeaders.get("cookie")),
  );

  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
