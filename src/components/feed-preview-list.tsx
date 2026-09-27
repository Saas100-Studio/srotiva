import type { FeedPreview } from "../lib/client/api-client.ts";

function warningLabel(warning: string): string {
  return warning.toLowerCase().replaceAll("_", " ");
}

export function FeedPreviewList({ preview }: { preview: FeedPreview }) {
  const sourceLabel = preview.sourceType === "native"
    ? `${preview.sourceFormat.toUpperCase()} feed found`
    : "Items extracted from webpage";

  return (
    <section className="feed-preview" aria-labelledby="feed-preview-heading">
      <div className="feed-preview__heading">
        <div>
          <p className="eyebrow">Preview</p>
          <h2 id="feed-preview-heading">{preview.feedTitle}</h2>
        </div>
        <span className="status-badge">{sourceLabel}</span>
      </div>

      {preview.warnings.length > 0 ? (
        <div className="feed-preview__warnings" role="status">
          <strong>Some fields were not available</strong>
          <ul>
            {preview.warnings.map((warning) => <li key={warning}>{warningLabel(warning)}</li>)}
          </ul>
        </div>
      ) : null}

      <ol className="feed-preview__items">
        {preview.previewItems.map((item, index) => (
          <li key={item.fingerprint || `${item.canonicalUrl ?? item.url}-${index}`}>
            <strong>{item.title || "Untitled item"}</strong>
            {item.descriptionText ? <p>{item.descriptionText}</p> : null}
            {item.datePublished ? (
              <time dateTime={item.datePublished}>
                {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.datePublished))}
              </time>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
