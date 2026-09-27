import { redirect } from "next/navigation.js";

import type { CurrentUser } from "./current-user.ts";

export function requireDashboardUser(currentUser: CurrentUser | null): CurrentUser {
  if (!currentUser) redirect("/login");
  return currentUser;
}
