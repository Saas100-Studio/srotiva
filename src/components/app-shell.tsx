import Link from "next/link";
import type { ReactNode } from "react";

import type { CurrentUser } from "../lib/auth/current-user.ts";
import { LogoutButton } from "./logout-button.tsx";
import { WorkspaceSwitcher } from "./workspace-switcher.tsx";

const navigation = [
  ["Feeds", "/dashboard"],
  ["Create feed", "/dashboard/feeds/new"],
  ["Settings", "/dashboard/settings"],
  ["Help", "/help"],
] as const;

export function AppShell({
  currentUser,
  children,
}: {
  currentUser: CurrentUser;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/dashboard" aria-label="Morsel dashboard">
          <span className="brand-mark"><span /></span>
          Morsel
        </Link>
        <span className="app-header__email">{currentUser.user.email}</span>
        <LogoutButton />
      </header>
      <aside className="app-sidebar">
        <WorkspaceSwitcher workspace={currentUser.activeWorkspace} />
        <nav className="app-nav" aria-label="Dashboard navigation">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  );
}
