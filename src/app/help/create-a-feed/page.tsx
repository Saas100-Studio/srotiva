import Link from "next/link";

import { createPublicPageMetadata } from "../../../lib/seo/metadata.ts";

export const metadata = createPublicPageMetadata({
  title: "Create a feed",
  description: "Learn how to create a Srotiva feed from a public website, RSS, or Atom URL.",
  path: "/help/create-a-feed",
});

export default function CreateFeedHelpPage() {
  return (
    <main className="help-article">
      <Link href="/help">← All help</Link>
      <p className="eyebrow">Help</p>
      <h1>Create a feed</h1>
      <ol>
        <li>Open <Link href="/dashboard/feeds/new">Create feed</Link> and paste a public website or RSS/Atom URL.</li>
        <li>Preview the items Srotiva finds and review any warnings.</li>
        <li>Name the feed, save it, and copy the output format you need.</li>
      </ol>
      <h2>Native feed or webpage?</h2>
      <p>When a source publishes RSS or Atom, Srotiva uses that structured feed. Otherwise, it can extract repeated article links from a static public webpage. Pages that require login, run only in a browser, or block crawlers may not work.</p>
    </main>
  );
}
