import Link from "next/link";

import { createPublicPageMetadata } from "../../../lib/seo/metadata.ts";

export const metadata = createPublicPageMetadata({
  title: "Accounts and limits",
  description: "Review Srotiva workspace limits, password controls, data exports, and account deletion.",
  path: "/help/accounts-and-limits",
});

export default function AccountsAndLimitsHelpPage() {
  return (
    <main className="help-article">
      <Link href="/help">← All help</Link>
      <p className="eyebrow">Help</p>
      <h1>Accounts and limits</h1>
      <h2>Early-access workspace limits</h2>
      <p>A workspace can currently retain up to 25 feeds and 10,000 feed items, and can request up to 1,000 manual refreshes per UTC calendar month. Scheduled refreshes are separate. If a limit is reached, Srotiva leaves existing data in place and identifies the limit in the error.</p>
      <h2>Password</h2>
      <p>Change your password from <Link href="/dashboard/settings">Settings</Link> by entering your current password and a new password. Never send a password to support.</p>
      <h2>Export your data</h2>
      <p>Settings provides a JSON export containing account, workspace, feed, item, filter, refresh-history, and audit-history data.</p>
      <h2>Delete your account</h2>
      <p>Account deletion requires your current password and an explicit confirmation. It permanently deletes a sole-owner workspace with its feeds and items and cannot be undone. If other workspace ownership would be affected, Srotiva stops the deletion so support can help arrange a safe transfer.</p>
    </main>
  );
}
