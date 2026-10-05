import Link from "next/link";

import { createPublicPageMetadata } from "../../../lib/seo/metadata.ts";

export const metadata = createPublicPageMetadata({
  title: "Keyword filters",
  description: "Learn how Srotiva keyword whitelist and blacklist filters affect feed items.",
  path: "/help/filters",
});

export default function FiltersHelpPage() {
  return (
    <main className="help-article">
      <Link href="/help">← All help</Link>
      <p className="eyebrow">Help</p>
      <h1>Keyword filters</h1>
      <p>Filters decide which discovered items remain active in RSS, JSON, and CSV outputs. They apply during the next refresh and do not change the source website.</p>
      <h2>Exclude matching items</h2>
      <p>A blacklist rule excludes an item when one of its keywords appears in the selected field. Blacklist matches take precedence over whitelist matches.</p>
      <h2>Require a match</h2>
      <p>When an enabled whitelist exists, an item must match at least one whitelist keyword. You can search the title, description, URL, author, or all supported fields.</p>
      <h2>Preview and change rules</h2>
      <p>Use “Preview impact” before saving to see bounded examples of included and excluded items. Disabling or deleting a rule affects later refreshes. Previously filtered items can become active again when the current rules allow them.</p>
      <p>Matching is case-insensitive substring matching. Enter up to 50 comma-separated keywords per rule, with no more than 80 characters per keyword.</p>
    </main>
  );
}
