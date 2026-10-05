import Link from "next/link";

import { createPublicPageMetadata } from "../../../lib/seo/metadata.ts";

export const metadata = createPublicPageMetadata({
  title: "Refreshes and history",
  description: "Learn how scheduled and manual feed refreshes, feed health, and refresh history work in Srotiva.",
  path: "/help/refreshes-and-history",
});

export default function RefreshHelpPage() {
  return (
    <main className="help-article">
      <Link href="/help">← All help</Link>
      <p className="eyebrow">Help</p>
      <h1>Refreshes and history</h1>
      <h2>Scheduled refreshes</h2>
      <p>Srotiva schedules active feeds at their configured interval. A failed refresh keeps previously published items available and retries later with a longer delay. Paused feeds are not refreshed.</p>
      <h2>Manual refresh</h2>
      <p>Editors and owners can request a manual refresh from the feed detail page. The request is queued rather than fetched in the browser. A cooldown prevents repeated requests, and Srotiva will tell you when another refresh is already queued or running.</p>
      <h2>Feed health</h2>
      <p>The feed detail page shows the last attempt, last success, last failure, next scheduled refresh, and consecutive failures. A degraded or failed state does not remove items from an earlier successful refresh.</p>
      <h2>Refresh history</h2>
      <p>Each recent run records whether it was scheduled or manual, its result, when it finished, and how many items were found or added. If a failure repeats, keep the time, displayed message, and any request ID when contacting support.</p>
    </main>
  );
}
