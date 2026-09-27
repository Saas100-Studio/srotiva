import Link from "next/link";
import type { ReactNode } from "react";

const legalLinks = [
  ["Terms", "/legal/terms"],
  ["Privacy", "/legal/privacy"],
  ["Acceptable use", "/legal/acceptable-use"],
  ["Takedown", "/legal/takedown"],
] as const;

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="help-page">
      <header className="help-header">
        <Link className="brand" href="/">Morsel</Link>
        <Link href="/help">Help</Link>
      </header>
      <div className="help-content">
        <p className="notice">Draft placeholder — not legal advice. These terms require qualified legal review before public launch.</p>
        <nav aria-label="Legal pages">
          {legalLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        {children}
      </div>
    </main>
  );
}
