import { headers } from "next/headers";
import Link from "next/link";

import { getOptionalCurrentUserFromCookieHeader } from "../../lib/auth/current-user.ts";
import { requireDashboardUser } from "../../lib/auth/dashboard.ts";
import { listFeeds } from "../../lib/db/repositories/feeds.ts";

type DashboardFeed = Awaited<ReturnType<typeof listFeeds>>[number];

export function DashboardIndex({
  workspaceName,
  feeds,
}: {
  workspaceName: string;
  feeds: DashboardFeed[];
}) {
  return (
    <section className="dashboard-index">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Feeds</p>
          <h1>{workspaceName}</h1>
          <p>Manage the feeds published from this workspace.</p>
        </div>
        <Link className="button" href="/dashboard/feeds/new">Create feed</Link>
      </div>

      {feeds.length === 0 ? (
        <div className="empty-state">
          <h2>Create your first feed</h2>
          <p>Paste a public website or RSS/Atom URL, preview it, and publish the output.</p>
          <Link className="button" href="/dashboard/feeds/new">Create feed</Link>
        </div>
      ) : (
        <section className="feed-list" aria-labelledby="recent-feeds-heading">
          <h2 id="recent-feeds-heading">Recent feeds</h2>
          <ul>
            {feeds.slice(0, 5).map((feed) => (
              <li key={feed.id}>
                <div>
                  <strong>{feed.name}</strong>
                  <span>{feed.sourceUrl}</span>
                </div>
                <span className="status-badge">{feed.status.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const requestHeaders = await headers();
  const currentUser = requireDashboardUser(
    await getOptionalCurrentUserFromCookieHeader(requestHeaders.get("cookie")),
  );
  const feeds = await listFeeds(currentUser.activeWorkspace.id);

  return (
    <DashboardIndex
      workspaceName={currentUser.activeWorkspace.name}
      feeds={feeds}
    />
  );
}
