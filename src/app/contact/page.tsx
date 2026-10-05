import Link from "next/link";

import { createPublicPageMetadata } from "../../lib/seo/metadata.ts";

const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "gouresh5901@gmail.com";

export const metadata = createPublicPageMetadata({
  title: "Contact",
  description: "Contact Srotiva for product support, privacy, security, abuse, or takedown requests.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className="help-page">
      <header className="help-header">
        <Link className="brand" href="/">Srotiva</Link>
        <nav className="help-header__nav" aria-label="Contact navigation">
          <Link href="/help">Help</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
      </header>
      <article className="help-article">
        <Link href="/help">← Help center</Link>
        <p className="eyebrow">Contact</p>
        <h1>How can we help?</h1>
        <p>
          Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> for product support,
          privacy questions, security reports, abuse reports, or takedown requests.
          Messages are reviewed on Indian business days during IST working hours.
        </p>

        <h2>Product support</h2>
        <p>To help us investigate, include the following when it is safe to do so:</p>
        <ul>
          <li>Your Srotiva account email and the name of the affected feed.</li>
          <li>The public source URL and the approximate time the problem occurred.</li>
          <li>Any request ID or error message displayed by Srotiva.</li>
        </ul>
        <p>Do not send your password, session cookie, or a private feed access token.</p>

        <h2>Security and privacy</h2>
        <p>
          Use the subject “Security report” for a possible vulnerability and “Privacy request”
          for questions about or requests concerning your personal data. Avoid including secrets
          in the first message; we can arrange a safer way to share sensitive details if needed.
        </p>

        <h2>Abuse and takedown</h2>
        <p>
          Identify the Srotiva feed or output URL, the original source material, your relationship
          to it, and the reason for the request. Use the subject “Abuse report” or “Takedown request”.
        </p>

        <h2>Before contacting us</h2>
        <p>For common feed problems, start with the <Link href="/help/troubleshooting">troubleshooting guide</Link>.</p>
      </article>
    </main>
  );
}
