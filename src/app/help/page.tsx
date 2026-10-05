import Link from "next/link";

import { createPublicPageMetadata } from "../../lib/seo/metadata.ts";

export const metadata = createPublicPageMetadata({
  title: "Help",
  description: "Learn how to create, publish, and troubleshoot feeds with Srotiva.",
  path: "/help",
});

const articles = [
  ["Create a feed", "Turn a public website or RSS/Atom URL into a saved feed.", "/help/create-a-feed"],
  ["Output formats", "Choose RSS, JSON, or CSV for the tool that will read your feed.", "/help/output-formats"],
  ["Refreshes and history", "Understand scheduled updates, manual refreshes, health, and refresh logs.", "/help/refreshes-and-history"],
  ["Keyword filters", "Include or exclude items with simple whitelist and blacklist rules.", "/help/filters"],
  ["Private feeds", "Use private output links safely and rotate an exposed access token.", "/help/private-feeds"],
  ["Accounts and limits", "Review workspace limits, data export, passwords, and account deletion.", "/help/accounts-and-limits"],
  ["Troubleshooting", "Understand unsafe URLs, blocked sources, missing feeds, and empty feeds.", "/help/troubleshooting"],
  ["How Srotiva crawls", "Learn how Srotiva identifies itself and respects source-site controls.", "/help/crawler-behavior"],
] as const;

const legal = [
  ["Terms", "/legal/terms"],
  ["Privacy", "/legal/privacy"],
  ["Acceptable use", "/legal/acceptable-use"],
  ["Takedown requests", "/legal/takedown"],
] as const;

export default function HelpPage() {
  return (
    <main className="help-page">
      <header className="help-header">
        <Link className="brand" href="/">Srotiva</Link>
        <nav className="help-header__nav" aria-label="Help navigation">
          <Link href="/contact">Contact</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
      </header>
      <div className="help-content">
        <p className="eyebrow">Help</p>
        <h1>Srotiva help</h1>
        <p className="help-intro">Create a feed from a public URL, review the extracted items, save it, then copy an output link.</p>
        <div className="help-card-grid">
          {articles.map(([title, description, href]) => (
            <Link className="help-card" href={href} key={href}>
              <h2>{title}</h2>
              <p>{description}</p>
            </Link>
          ))}
        </div>
        <section className="help-contact-card" aria-labelledby="help-contact-heading">
          <div>
            <h2 id="help-contact-heading">Need more help?</h2>
            <p>Contact support with the affected feed URL, the time of the problem, and any request ID shown by Srotiva.</p>
          </div>
          <Link className="button button--ghost" href="/contact">Contact support</Link>
        </section>
        <h2>Legal</h2>
        <p>These pages are draft placeholders pending legal review.</p>
        <nav className="help-inline-links" aria-label="Legal pages">
          {legal.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </div>
    </main>
  );
}
