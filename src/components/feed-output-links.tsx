"use client";

import { useState } from "react";

type OutputUrls = { rss: string; json: string; csv: string };

export function FeedOutputLinks({ outputUrls }: { outputUrls: OutputUrls }) {
  const [message, setMessage] = useState("");

  async function copy(label: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(`${label} link copied.`);
    } catch {
      setMessage("Copy failed. Select the link and copy it manually.");
    }
  }

  return (
    <section className="feed-detail-card" aria-labelledby="output-links-heading">
      <h2 id="output-links-heading">Output links</h2>
      <p>Use these links in a feed reader or another tool.</p>
      <div className="output-links">
        {Object.entries(outputUrls).map(([format, url]) => {
          const label = format.toUpperCase();
          return (
            <div className="output-link" key={format}>
              <label htmlFor={`output-${format}`}>{label}</label>
              <input id={`output-${format}`} readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
              <button className="button button--ghost button--small" type="button" aria-label={`Copy ${label} link`} onClick={() => copy(label, url)}>
                Copy
              </button>
            </div>
          );
        })}
      </div>
      <p className="copy-status" aria-live="polite">{message}</p>
    </section>
  );
}
