import Link from "next/link";

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
      <section className="empty-state feed-items-empty" aria-labelledby="feed-items-heading">
        <h2 id="feed-items-heading">No items yet</h2>
        <p>This feed has not produced any items. Check the source URL, or create a different feed.</p>
        <Link className="button button--ghost" href="/dashboard/feeds/new">Create another feed</Link>
      </section>
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
