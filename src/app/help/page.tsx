import Link from "next/link";

const articles = [
  ["Create a feed", "Turn a public website or RSS/Atom URL into a saved feed.", "/help/create-a-feed"],
  ["Output formats", "Choose RSS, JSON, or CSV for the tool that will read your feed.", "/help/output-formats"],
  ["Troubleshooting", "Understand unsafe URLs, blocked sources, missing feeds, and empty feeds.", "/help/troubleshooting"],
] as const;

export default function HelpPage() {
  return (
    <main className="help-page">
      <header className="help-header">
        <Link className="brand" href="/dashboard">Morsel</Link>
        <Link href="/dashboard">Back to dashboard</Link>
      </header>
      <div className="help-content">
        <p className="eyebrow">Help</p>
        <h1>Morsel help</h1>
        <p className="help-intro">Create a feed from a public URL, review the extracted items, save it, then copy an output link.</p>
        <div className="help-card-grid">
          {articles.map(([title, description, href]) => (
            <Link className="help-card" href={href} key={href}>
              <h2>{title}</h2>
              <p>{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
