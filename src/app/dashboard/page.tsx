import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation.js";

import { FeedStatusBadge } from "../../components/feed-status-badge.tsx";
import { EmptyState } from "../../components/empty-state.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../lib/auth/current-user.ts";
import { requireDashboardUser } from "../../lib/auth/dashboard.ts";
import { listDashboardFeeds } from "../../lib/db/repositories/feeds.ts";
import { getFeedHealth } from "../../lib/feed/feed-health.ts";

type DashboardFeed = Awaited<ReturnType<typeof listDashboardFeeds>>["feeds"][number];

function dashboardHref(page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/dashboard?${suffix}` : "/dashboard";
}

export function DashboardIndex({
  workspaceName,
  feeds,
  page,
  query,
  hasPreviousPage,
  hasNextPage,
}: {
  workspaceName: string;
  feeds: DashboardFeed[];
  page: number;
  query: string;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
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

      <form action="/dashboard" method="get" role="search" className="auth-form feed-create__url-row">
        <label htmlFor="feed-search">
          <span>Search feeds</span>
          <input
            id="feed-search"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={100}
            placeholder="Name or source URL"
          />
        </label>
        <button className="button button--secondary" type="submit">Search</button>
      </form>

      {feeds.length === 0 && !query ? (
        <EmptyState
          title="Create your first feed"
          labelledBy="dashboard-empty-heading"
          action={<Link className="button" href="/dashboard/feeds/new">Create feed</Link>}
        >
          <p>Paste a public website or RSS/Atom URL, preview it, and publish the output.</p>
        </EmptyState>
      ) : feeds.length === 0 ? (
        <EmptyState
          title="No matching feeds"
          labelledBy="dashboard-empty-heading"
          action={<Link className="button button--secondary" href="/dashboard">Clear search</Link>}
        >
          <p>Try a different feed name or source URL.</p>
        </EmptyState>
      ) : (
        <section className="feed-list" aria-labelledby="recent-feeds-heading">
          <h2 id="recent-feeds-heading">{query ? "Search results" : "Feeds"}</h2>
          <ul>
            {feeds.map((feed) => (
              <li key={feed.id}>
                <div>
                  <strong><Link href={`/dashboard/feeds/${feed.id}`}>{feed.name}</Link></strong>
                  <span>{feed.sourceUrl}</span>
                </div>
                <FeedStatusBadge status={getFeedHealth(feed).healthStatus} />
              </li>
            ))}
          </ul>
          {(hasPreviousPage || hasNextPage) ? (
            <nav className="state-actions" aria-label="Feed pages">
              {hasPreviousPage ? (
                <Link href={dashboardHref(page - 1, query)}>Previous</Link>
              ) : null}
              <span aria-current="page">Page {page}</span>
              {hasNextPage ? (
                <Link href={dashboardHref(page + 1, query)}>Next</Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      )}
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
}) {
  const requestHeaders = await headers();
  const currentUser = requireDashboardUser(
    await getOptionalCurrentUserFromCookieHeader(requestHeaders.get("cookie")),
  );
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const result = await listDashboardFeeds(currentUser.activeWorkspace.id, {
    page: Number(rawPage ?? "1"),
    query: rawQuery ?? "",
  });
  if (result.page > 1 && result.feeds.length === 0) {
    redirect(dashboardHref(1, result.query));
  }

  return (
    <DashboardIndex
      workspaceName={currentUser.activeWorkspace.name}
      feeds={result.feeds}
      page={result.page}
      query={result.query}
      hasPreviousPage={result.hasPreviousPage}
      hasNextPage={result.hasNextPage}
    />
  );
}
