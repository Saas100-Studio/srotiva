"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route failed", error);
  }, [error]);

  return (
    <section className="dashboard-index error-state" role="alert" aria-labelledby="dashboard-error-heading">
      <h1 id="dashboard-error-heading">The dashboard could not load</h1>
      <p>Your data has not been changed. Try the request again, or return to your feeds.</p>
      <div className="state-actions">
        <button className="button" type="button" onClick={reset}>Try again</button>
        <Link href="/dashboard">Return to feeds</Link>
      </div>
    </section>
  );
}
