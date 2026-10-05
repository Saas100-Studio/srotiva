import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="not-found-heading">
        <p className="eyebrow">404</p>
        <h1 id="not-found-heading">Page not found</h1>
        <p>The page may have moved, or the address may be incorrect.</p>
        <div className="state-actions">
          <Link className="button" href="/dashboard">Go to dashboard</Link>
          <Link href="/help">Visit help</Link>
        </div>
      </section>
    </main>
  );
}
