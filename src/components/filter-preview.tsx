import type { FeedFilterPreview as Preview } from "../lib/client/api-client.ts";

function itemTitle(item: { title: string | null; canonicalUrl: string | null; url: string | null }): string {
  return item.title ?? item.canonicalUrl ?? item.url ?? "Untitled item";
}

function reasonText(reason: Preview["excludedItems"][number]["reason"]): string {
  return reason.code === "BLACKLIST_MATCH"
    ? `Blacklist matched “${reason.keyword}” in ${reason.field}.`
    : "No whitelist keyword matched.";
}

export function FilterPreview({ preview }: { preview: Preview }) {
  return (
    <div className="filter-preview" aria-live="polite">
      <h3>Preview</h3>
      <dl className="filter-preview__counts">
        <div><dt>Included</dt><dd>{preview.includedCount}</dd></div>
        <div><dt>Excluded</dt><dd>{preview.excludedCount}</dd></div>
      </dl>
      {preview.excludedItems.length ? (
        <div>
          <h4>Excluded samples</h4>
          <ul>
            {preview.excludedItems.slice(0, 5).map((item) => (
              <li key={item.id}><strong>{itemTitle(item)}</strong><span>{reasonText(item.reason)}</span></li>
            ))}
          </ul>
        </div>
      ) : <p className="muted-copy">No existing items would be excluded.</p>}
      {preview.includedItems.length ? (
        <details>
          <summary>Included samples</summary>
          <ul>{preview.includedItems.slice(0, 5).map((item) => <li key={item.id}>{itemTitle(item)}</li>)}</ul>
        </details>
      ) : null}
    </div>
  );
}
