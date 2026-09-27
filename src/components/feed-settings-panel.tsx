"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteFeed, updateFeedStatus } from "../lib/client/api-client.ts";
import { FeedStatusBadge } from "./feed-status-badge.tsx";

type FeedSettingsPanelProps = {
  workspaceId: string;
  feedId: string;
  feedName: string;
  initialStatus: "ACTIVE" | "PAUSED" | string;
  visibility: string;
  refreshIntervalMinutes: number;
  canManage: boolean;
};

export function FeedSettingsPanel({
  workspaceId,
  feedId,
  feedName,
  initialStatus,
  visibility,
  refreshIntervalMinutes,
  canManage,
}: FeedSettingsPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggleStatus() {
    const nextStatus = status === "PAUSED" ? "ACTIVE" : "PAUSED";
    setPending(true);
    setError("");
    try {
      const feed = await updateFeedStatus(workspaceId, feedId, nextStatus);
      setStatus(feed.status);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update the feed.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${feedName}”? This cannot be undone.`)) return;
    setPending(true);
    setError("");
    try {
      await deleteFeed(workspaceId, feedId);
      router.push("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete the feed.");
      setPending(false);
    }
  }

  return (
    <section className="feed-detail-card" aria-labelledby="feed-settings-heading">
      <h2 id="feed-settings-heading">Settings</h2>
      <dl className="feed-facts">
        <div><dt>Status</dt><dd><FeedStatusBadge status={status} /></dd></div>
        <div><dt>Visibility</dt><dd>{visibility.toLowerCase()}</dd></div>
        <div><dt>Refresh interval</dt><dd>Every {refreshIntervalMinutes} minutes</dd></div>
      </dl>
      {canManage ? (
        <div className="feed-actions">
          <button className="button button--ghost" type="button" onClick={toggleStatus} disabled={pending}>
            {status === "PAUSED" ? "Resume feed" : "Pause feed"}
          </button>
          <button className="button button--danger" type="button" onClick={remove} disabled={pending}>Delete feed</button>
        </div>
      ) : <p className="muted-copy">You have view-only access to this feed.</p>}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}
