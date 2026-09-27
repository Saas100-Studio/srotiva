"use client";

import { useState } from "react";

import { ClientApiError, requestFeedRefresh } from "../lib/client/api-client.ts";
import { ErrorState } from "./error-state.tsx";

export function ManualRefreshButton({
  workspaceId,
  feedId,
  paused,
}: {
  workspaceId: string;
  feedId: string;
  paused: boolean;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [queued, setQueued] = useState(false);

  async function refresh() {
    setPending(true);
    setMessage("");
    setError(null);
    try {
      await requestFeedRefresh(workspaceId, feedId);
      setQueued(true);
      setMessage("Refresh queued.");
    } catch (error) {
      if (error instanceof ClientApiError && error.code === "REFRESH_THROTTLED") {
        setMessage(`Try again in ${Number(error.details.secondsRemaining) || 1} seconds.`);
      } else {
        setError({
          message: error instanceof Error ? error.message : "Unable to queue refresh.",
          requestId: error instanceof ClientApiError ? error.requestId : undefined,
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="feed-actions">
      <button className="button button--ghost" type="button" onClick={refresh} disabled={pending || queued || paused}>
        {pending ? "Queuing…" : queued ? "Refresh queued" : "Refresh now"}
      </button>
      {paused ? <p className="muted-copy">Resume this feed to refresh it.</p> : null}
      {message ? <p className="muted-copy" role="status" aria-live="polite">{message}</p> : null}
      {error ? <ErrorState message={error.message} requestId={error.requestId} /> : null}
    </div>
  );
}
