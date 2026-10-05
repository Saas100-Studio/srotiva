import Link from "next/link";

import { loadAppUrl } from "../lib/config/app-url.ts";
import { createPublicPageMetadata } from "../lib/seo/metadata.ts";

export const metadata = createPublicPageMetadata({
  title: "Reliable feeds from the web",
  description: "Turn websites and native feeds into reliable RSS, JSON, and CSV feeds.",
  path: "/",
});

export default function Home() {
  const appUrl = loadAppUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Srotiva",
    url: appUrl,
    description: "Turn websites and native feeds into reliable RSS, JSON, and CSV feeds.",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
  };

  return (
    <main className="landing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
      <header className="landing-header">
        <Link className="brand" href="/" aria-label="Srotiva home">
          Srotiva
        </Link>
        <nav className="landing-actions" aria-label="Account navigation">
          <Link href="/help">Help</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Sign in</Link>
          <Link className="button button--small" href="/signup">Sign up</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">Reliable feeds from the web</p>
        <h1>Turn a website into a feed you can use anywhere.</h1>
        <p className="landing-copy">
          Srotiva discovers native feeds or extracts public pages, then publishes
          clean RSS, JSON, and CSV output.
        </p>
        <div className="landing-hero__actions">
          <Link className="button" href="/signup">Create an account</Link>
          <Link className="button button--ghost" href="/login">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
