import Link from "next/link";

export default function TroubleshootingHelpPage() {
  return (
    <main className="help-article">
      <Link href="/help">← All help</Link>
      <p className="eyebrow">Help</p>
      <h1>Troubleshooting</h1>
      <section><h2>Unsafe URL</h2><p>Use a public HTTP or HTTPS address. Local, private-network, credentialed, and unusual-port URLs are blocked for safety.</p></section>
      <section><h2>No feed found</h2><p>Try the site&apos;s direct RSS or Atom URL. Some pages do not expose a feed or enough repeated links to extract reliably.</p></section>
      <section><h2>Blocked source</h2><p>The source may disallow crawlers, require a login, or reject automated requests. Morsel does not bypass those restrictions.</p></section>
      <section><h2>Empty feed</h2><p>Confirm that the source currently publishes items. If it does, create the feed again using its direct RSS or Atom URL.</p></section>
      <section><h2>Still stuck?</h2><p>Retry once. If an error shows a request ID, keep it with the time of the failure so the request can be traced.</p></section>
    </main>
  );
}
