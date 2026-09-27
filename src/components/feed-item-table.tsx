import Link from "next/link";

import { EmptyState } from "./empty-state.tsx";

type FeedItem = {
  id: string;
  title: string | null;
  canonicalUrl: string | null;
  url: string | null;
  datePublished: Date | null;
};

function displayDate(value: Date | null): string {
  return value ? value.toLocaleDateString("en", { dateStyle: "medium" }) : "Date unavailable";
}

export function FeedItemTable({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No items yet"
        labelledBy="feed-items-heading"
        className="feed-items-empty"
        action={(
          <div className="state-actions">
            <Link className="button button--ghost" href="/help/troubleshooting">Troubleshoot this feed</Link>
            <Link href="/dashboard/feeds/new">Create another feed</Link>
          </div>
        )}
      >
        <p>This feed has not produced any items. Check the source and common causes.</p>
      </EmptyState>
    );
  }

  return (
    <section className="feed-detail-card" aria-labelledby="feed-items-heading">
      <h2 id="feed-items-heading">Latest items</h2>
      <div className="feed-item-table-wrap">
        <table className="feed-item-table">
          <thead><tr><th scope="col">Title</th><th scope="col">Published</th><th scope="col">URL</th></tr></thead>
          <tbody>
            {items.map((item) => {
              const itemUrl = item.canonicalUrl ?? item.url;
              return (
                <tr key={item.id}>
                  <td>{item.title ?? "Untitled item"}</td>
                  <td>{displayDate(item.datePublished)}</td>
                  <td>{itemUrl ? <a href={itemUrl} rel="noreferrer" target="_blank">Open item</a> : "Unavailable"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
