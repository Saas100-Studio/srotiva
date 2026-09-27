import Link from "next/link";

export default function OutputFormatsHelpPage() {
  return (
    <main className="help-article">
      <Link href="/help">← All help</Link>
      <p className="eyebrow">Help</p>
      <h1>Output formats</h1>
      <dl className="help-formats">
        <div><dt>RSS</dt><dd>Use with feed readers and tools that accept an RSS URL.</dd></div>
        <div><dt>JSON</dt><dd>Use for applications that consume structured feed and item data.</dd></div>
        <div><dt>CSV</dt><dd>Use for spreadsheets or a one-time tabular export.</dd></div>
      </dl>
      <p>Copy links from a feed&apos;s detail page. Private feed links include a secret token; treat them like passwords and do not publish them.</p>
    </main>
  );
}
