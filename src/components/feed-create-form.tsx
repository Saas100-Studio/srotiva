"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  discoverFeed,
  feedCreationErrorMessage,
  saveFeedPreview,
  type FeedPreview,
} from "../lib/client/api-client.ts";
import { FeedPreviewList } from "./feed-preview-list.tsx";

export function FeedCreateForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [feedName, setFeedName] = useState("");
  const [preview, setPreview] = useState<FeedPreview | null>(null);
  const [error, setError] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);

  async function discover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = sourceUrl.trim();
    if (!url) {
      setError("Enter a website or feed URL.");
      return;
    }

    setError("");
    setPreview(null);
    setDiscovering(true);
    try {
      const result = await discoverFeed(workspaceId, url);
      setPreview(result);
      setFeedName(result.feedTitle);
    } catch (requestError) {
      setError(feedCreationErrorMessage(requestError));
    } finally {
      setDiscovering(false);
    }
  }

  async function save() {
    if (!preview?.previewItems.length || !feedName.trim()) return;
    setError("");
    setSaving(true);
    try {
      const feed = await saveFeedPreview(workspaceId, preview, feedName.trim());
      router.push(`/dashboard/feeds/${feed.id}`);
    } catch (requestError) {
      setError(feedCreationErrorMessage(requestError));
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
              setError("");
            }}
            disabled={discovering || saving}
            required
          />
          <button className="button" type="submit" disabled={discovering || saving}>
            {discovering ? "Finding feed…" : "Preview feed"}
          </button>
        </div>
      </form>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

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
