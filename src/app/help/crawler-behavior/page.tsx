import Link from "next/link";

import { createPublicPageMetadata } from "../../../lib/seo/metadata.ts";

export const metadata = createPublicPageMetadata({
  title: "How Srotiva crawls",
  description: "Learn how the Srotiva crawler identifies itself, follows robots rules, and fetches public sources.",
  path: "/help/crawler-behavior",
});

export default function CrawlerBehaviorHelpPage() {
  return (
    <main className="help-article">
      <Link href="/help">← All help</Link>
      <p className="eyebrow">Help</p>
      <h1>How Srotiva crawls</h1>
      <p>Srotiva fetches public RSS, Atom, and webpage sources only when a user asks it to create or refresh a feed. Production requests identify the crawler with the <code>SrotivaBot</code> product token.</p>
      <h2>Source-site controls</h2>
      <p>Srotiva checks the source site&apos;s robots policy before fetching and does not bypass logins, paywalls, CAPTCHAs, or anti-bot restrictions. It follows redirects only after checking each destination for network safety.</p>
      <h2>Blocking Srotiva</h2>
      <p>Site operators can address <code>SrotivaBot</code> in their <code>robots.txt</code> rules. Rules for the exact product token are preferred; ordinary wildcard rules also apply when no exact group exists. Changes may take a short time to be observed because robots rules are cached briefly.</p>
      <h2>Report a problem</h2>
      <p>If Srotiva is accessing content unexpectedly, <Link href="/contact">contact us</Link> with the affected hostname, relevant URLs, approximate times, and any server-log user-agent details. Do not include passwords or private feed tokens.</p>
    </main>
  );
}
