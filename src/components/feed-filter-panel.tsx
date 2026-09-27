"use client";

import { type FormEvent, useEffect, useState } from "react";

import {
  ClientApiError,
  createFeedFilter,
  deleteFeedFilter,
  type FeedFilter,
  type FeedFilterInput,
  type FeedFilterPreview as Preview,
  listFeedFilters,
  previewFeedFilter,
  updateFeedFilter,
} from "../lib/client/api-client.ts";
import { ErrorState } from "./error-state.tsx";
import { FilterPreview } from "./filter-preview.tsx";

const fields: Array<{ value: FeedFilterInput["field"]; label: string }> = [
  { value: "any", label: "Title, description, URL, or author" },
  { value: "title", label: "Title" },
  { value: "description", label: "Description" },
  { value: "url", label: "URL" },
  { value: "author", label: "Author" },
];

function requestError(error: unknown, fallback: string): { message: string; requestId?: string } {
  return {
    message: error instanceof Error ? error.message : fallback,
    requestId: error instanceof ClientApiError ? error.requestId : undefined,
  };
}

function parseKeywords(value: string): string[] {
  return [...new Set(value.split(",").map((keyword) => keyword.trim()).filter(Boolean))];
}

export function FeedFilterPanel({
  workspaceId,
  feedId,
  canManage,
}: {
  workspaceId: string;
  feedId: string;
  canManage: boolean;
}) {
  const [filters, setFilters] = useState<FeedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [validationError, setValidationError] = useState("");
  const [type, setType] = useState<FeedFilterInput["type"]>("blacklist");
  const [field, setField] = useState<FeedFilterInput["field"]>("any");
  const [keywordText, setKeywordText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const formDisabled = loading || pending !== null;

  useEffect(() => {
    let active = true;
    listFeedFilters(workspaceId, feedId)
      .then((rules) => { if (active) setFilters(rules); })
      .catch((requestFailure) => { if (active) setError(requestError(requestFailure, "Unable to load filters.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, feedId]);

  function input(): FeedFilterInput | null {
    const keywords = parseKeywords(keywordText);
    if (!keywords.length) {
      setValidationError("Enter at least one keyword.");
      return null;
    }
    if (keywords.length > 50 || keywords.some((keyword) => keyword.length > 80)) {
      setValidationError("Use no more than 50 keywords, with at most 80 characters each.");
      return null;
    }
    setValidationError("");
    return { type, field, keywords, isEnabled: true };
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const rule = input();
    if (!rule) return;
    setPending("create");
    setError(null);
    try {
      const created = await createFeedFilter(workspaceId, feedId, rule);
      setFilters((current) => [...current, created]);
      setKeywordText("");
      setPreview(null);
    } catch (requestFailure) {
      setError(requestError(requestFailure, "Unable to create the filter."));
    } finally {
      setPending(null);
    }
  }

  async function showPreview() {
    const rule = input();
    if (!rule) return;
    setPending("preview");
    setError(null);
    try {
      setPreview(await previewFeedFilter(workspaceId, feedId, rule));
    } catch (requestFailure) {
      setError(requestError(requestFailure, "Unable to preview the filter."));
    } finally {
      setPending(null);
    }
  }

  async function toggle(filter: FeedFilter) {
    setPending(filter.id);
    setError(null);
    try {
      const updated = await updateFeedFilter(workspaceId, feedId, filter.id, { isEnabled: !filter.isEnabled });
      setFilters((current) => current.map((rule) => rule.id === updated.id ? updated : rule));
      setPreview(null);
    } catch (requestFailure) {
      setError(requestError(requestFailure, "Unable to update the filter."));
    } finally {
      setPending(null);
    }
  }

  async function remove(filter: FeedFilter) {
    if (!window.confirm("Delete this filter?")) return;
    setPending(filter.id);
    setError(null);
    try {
      await deleteFeedFilter(workspaceId, feedId, filter.id);
      setFilters((current) => current.filter((rule) => rule.id !== filter.id));
      setPreview(null);
    } catch (requestFailure) {
      setError(requestError(requestFailure, "Unable to delete the filter."));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="feed-detail-card filter-panel" aria-labelledby="filters-heading">
      <h2 id="filters-heading">Filters</h2>
      <p>Filters apply on the next refresh. RSS, JSON, and CSV outputs include active items only.</p>

      {loading ? <p className="muted-copy" role="status">Loading filters…</p> : filters.length ? (
        <ul className="filter-list">
          {filters.map((filter) => (
            <li key={filter.id}>
              <div>
                <strong>{filter.type === "blacklist" ? "Exclude" : "Require"} · {filter.field ?? "any"}</strong>
                <span>{filter.keywords.join(", ")}</span>
                <span>{filter.isEnabled ? "Enabled" : "Disabled"}</span>
              </div>
              {canManage ? (
                <div className="filter-list__actions">
                  <button
                    aria-label={`${filter.isEnabled ? "Disable" : "Enable"} ${filter.type} filter: ${filter.keywords.join(", ")}`}
                    className="button button--ghost"
                    type="button"
                    disabled={pending !== null}
                    onClick={() => toggle(filter)}
                  >
                    {filter.isEnabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    aria-label={`Delete ${filter.type} filter: ${filter.keywords.join(", ")}`}
                    className="button button--danger"
                    type="button"
                    disabled={pending !== null}
                    onClick={() => remove(filter)}
                  >Delete</button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : error ? null : <p className="muted-copy">No filters yet. All discovered items remain active.</p>}

      {canManage ? (
        <form className="filter-form" onSubmit={save}>
          <h3>Add a keyword filter</h3>
          <label htmlFor="filter-type">Rule</label>
          <select id="filter-type" value={type} disabled={formDisabled} onChange={(event) => { setType(event.target.value as FeedFilterInput["type"]); setPreview(null); }}>
            <option value="blacklist">Exclude items that match</option>
            <option value="whitelist">Require items to match</option>
          </select>
          <label htmlFor="filter-field">Look in</label>
          <select id="filter-field" value={field} disabled={formDisabled} onChange={(event) => { setField(event.target.value as FeedFilterInput["field"]); setPreview(null); }}>
            {fields.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label htmlFor="filter-keywords">Keywords, separated by commas</label>
          <input id="filter-keywords" value={keywordText} disabled={formDisabled} onChange={(event) => { setKeywordText(event.target.value); setPreview(null); }} placeholder="sponsored, advertisement" />
          {validationError ? <p className="form-error" role="alert">{validationError}</p> : null}
          <div className="feed-actions">
            <button className="button button--ghost" type="button" disabled={formDisabled} onClick={showPreview}>
              {pending === "preview" ? "Previewing…" : "Preview impact"}
            </button>
            <button className="button" type="submit" disabled={formDisabled}>
              {pending === "create" ? "Adding…" : "Add filter"}
            </button>
          </div>
        </form>
      ) : <p className="muted-copy">You have view-only access to these filters.</p>}

      {preview ? <FilterPreview preview={preview} /> : null}
      {error ? <ErrorState message={error.message} requestId={error.requestId} /> : null}
    </section>
  );
}
