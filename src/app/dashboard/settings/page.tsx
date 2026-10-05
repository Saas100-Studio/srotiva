import type { Metadata } from "next";
import { headers } from "next/headers";

import { AccountSettings } from "../../../components/account-settings.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../../lib/auth/current-user.ts";
import { requireDashboardUser } from "../../../lib/auth/dashboard.ts";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const requestHeaders = await headers();
  const currentUser = requireDashboardUser(
    await getOptionalCurrentUserFromCookieHeader(requestHeaders.get("cookie")),
  );

  return (
    <section className="feed-detail-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
          <p>Manage the account for {currentUser.user.email}.</p>
        </div>
      </div>
      <AccountSettings email={currentUser.user.email} />
    </section>
  );
}
