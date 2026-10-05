import Link from "next/link";

import { createPublicPageMetadata } from "../../../lib/seo/metadata.ts";

export const metadata = createPublicPageMetadata({
  title: "Private feeds",
  description: "Learn how to protect and rotate Srotiva private feed access tokens.",
  path: "/help/private-feeds",
});

export default function PrivateFeedsHelpPage() {
  return (
    <main className="help-article">
      <Link href="/help">← All help</Link>
      <p className="eyebrow">Help</p>
      <h1>Private feeds</h1>
      <p>A private RSS, JSON, or CSV URL includes a secret access token. Anyone who has the complete URL can read that feed, so treat it like a password.</p>
      <h2>Share safely</h2>
      <ul>
        <li>Paste the URL only into a feed reader or application you trust.</li>
        <li>Do not post it publicly, include it in screenshots, or send it in support messages.</li>
        <li>Do not place it in client-side code or a public repository.</li>
      </ul>
      <h2>Rotate an exposed token</h2>
      <p>Owners and editors can select “Rotate access token” in feed settings. Every old private output URL stops working immediately. Srotiva shows the replacement URLs once, so update connected readers before leaving or refreshing the page.</p>
      <h2>Missing private links</h2>
      <p>For security, Srotiva does not reveal an existing token later. Rotate it to receive new ready-to-use links.</p>
    </main>
  );
}
