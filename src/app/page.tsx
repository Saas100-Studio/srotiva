import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="brand" href="/" aria-label="Morsel home">
          <span className="brand-mark"><span /></span>
          Morsel
        </Link>
        <nav className="landing-actions" aria-label="Account navigation">
          <Link href="/login">Sign in</Link>
          <Link className="button button--small" href="/signup">Sign up</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">Reliable feeds from the web</p>
        <h1>Turn a website into a feed you can use anywhere.</h1>
        <p className="landing-copy">
          Morsel discovers native feeds or extracts public pages, then publishes
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
