"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  discoverFeed,
  ClientApiError,
  feedCreationErrorMessage,
  saveFeedPreview,
  type FeedPreview,
} from "../lib/client/api-client.ts";
import { FeedPreviewList } from "./feed-preview-list.tsx";
import { ErrorState } from "./error-state.tsx";
import { LoadingState } from "./loading-state.tsx";

export function FeedCreateForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [feedName, setFeedName] = useState("");
  const [preview, setPreview] = useState<FeedPreview | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);

  async function discover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = sourceUrl.trim();
    if (!url) {
      setError({ message: "Enter a website or feed URL." });
      return;
    }

    setError(null);
    setPreview(null);
    setDiscovering(true);
    try {
      const result = await discoverFeed(workspaceId, url);
      setPreview(result);
      setFeedName(result.feedTitle);
    } catch (requestError) {
      setError({
        message: feedCreationErrorMessage(requestError),
        requestId: requestError instanceof ClientApiError ? requestError.requestId : undefined,
      });
    } finally {
      setDiscovering(false);
    }
  }

  async function save() {
    if (!preview?.previewItems.length || !feedName.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const feed = await saveFeedPreview(workspaceId, preview, feedName.trim());
      router.push(`/dashboard/feeds/${feed.id}`);
    } catch (requestError) {
      setError({
        message: feedCreationErrorMessage(requestError),
        requestId: requestError instanceof ClientApiError ? requestError.requestId : undefined,
      });
      setSaving(false);
    }
  }

  return (
    <div className="feed-create">
      <form className="feed-create__form" onSubmit={discover} noValidate>
        <label htmlFor="source-url">Website or RSS/Atom URL</label>
        <div className="feed-create__url-row">
          <input
            id="source-url"
            name="sourceUrl"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com/blog"
            value={sourceUrl}
            onChange={(event) => {
              setSourceUrl(event.target.value);
              setPreview(null);
              setError(null);
            }}
            disabled={discovering || saving}
            required
          />
          <button className="button" type="submit" disabled={discovering || saving}>
            {discovering ? "Finding feed…" : "Preview feed"}
          </button>
        </div>
      </form>

      {discovering ? <LoadingState label="Checking this source…" /> : null}
      {error ? <ErrorState message={error.message} requestId={error.requestId} /> : null}

      {preview ? (
        <>
          <FeedPreviewList preview={preview} />
          <section className="feed-save" aria-labelledby="feed-save-heading">
            <div>
              <h2 id="feed-save-heading">Save feed</h2>
              <p>You can rename it before saving.</p>
            </div>
            <label htmlFor="feed-name">Feed name</label>
            <input
              id="feed-name"
              value={feedName}
              onChange={(event) => setFeedName(event.target.value)}
              maxLength={500}
              disabled={saving}
              required
            />
            <button
              className="button"
              type="button"
              onClick={save}
              disabled={saving || preview.previewItems.length === 0 || !feedName.trim()}
            >
              {saving ? "Saving…" : "Save feed"}
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
