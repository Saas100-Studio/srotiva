import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "../../components/logout-button.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../lib/auth/current-user.ts";

export default async function DashboardPage() {
  const requestHeaders = await headers();
  const currentUser = await getOptionalCurrentUserFromCookieHeader(
    requestHeaders.get("cookie"),
  );

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <main className="auth-page">
      <section className="auth-card dashboard-card">
        <div className="dashboard-card__header">
          <Link className="brand" href="/" aria-label="Morsel home">
            <span className="brand-mark"><span /></span>
            Morsel
          </Link>
          <LogoutButton />
        </div>
        <p className="eyebrow">Dashboard</p>
        <h1>{currentUser.activeWorkspace.name}</h1>
        <p className="auth-card__intro">
          Signed in as {currentUser.user.email}. Your workspace is ready.
        </p>
      </section>
    </main>
  );
}
