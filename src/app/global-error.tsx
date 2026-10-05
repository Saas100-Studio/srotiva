"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application render failed", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="auth-page">
          <section className="auth-card" role="alert" aria-labelledby="global-error-heading">
            <p className="eyebrow">Srotiva</p>
            <h1 id="global-error-heading">Something went wrong</h1>
            <p>The application could not load. Try again; if the problem continues, visit the help center.</p>
            <div className="state-actions">
              <button className="button" type="button" onClick={reset}>Try again</button>
              <a href="/help">Visit help</a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
