import { FeedVisibility } from "@prisma/client";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { FeedItemTable } from "../../../../components/feed-item-table.tsx";
import { FeedOutputLinks } from "../../../../components/feed-output-links.tsx";
import { FeedSettingsPanel } from "../../../../components/feed-settings-panel.tsx";
import { FeedStatusBadge } from "../../../../components/feed-status-badge.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../../../lib/auth/current-user.ts";
import { requireDashboardUser } from "../../../../lib/auth/dashboard.ts";
import { loadEnv } from "../../../../lib/config/env.ts";
import { findFeedDetail, initializePrivateFeedToken, listFeedItems } from "../../../../lib/db/repositories/feeds.ts";
import { listRecentRefreshJobs } from "../../../../lib/db/repositories/jobs.ts";
import { createPrivateFeedToken, hashPrivateFeedToken } from "../../../../lib/feed/feed-output-token.ts";

function displayDate(value: Date | null): string {
  return value ? value.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : "Not scheduled";
}

export default async function FeedDetailPage({ params }: { params: Promise<{ feedId: string }> }) {
  const requestHeaders = await headers();
  const currentUser = requireDashboardUser(
    await getOptionalCurrentUserFromCookieHeader(requestHeaders.get("cookie")),
  );
  const { feedId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(feedId)) notFound();
  const workspaceId = currentUser.activeWorkspace.id;
  const feed = await findFeedDetail(workspaceId, feedId);
  if (!feed) notFound();

  const [itemsResult, refreshJobs] = await Promise.all([
    listFeedItems(workspaceId, feedId, 25),
    listRecentRefreshJobs(workspaceId, feedId),
  ]);
  const privateToken = feed.visibility === FeedVisibility.PRIVATE ? createPrivateFeedToken(feed.id) : null;
  if (privateToken) await initializePrivateFeedToken(workspaceId, feed.id, hashPrivateFeedToken(privateToken));
  const suffix = privateToken ? `?token=${encodeURIComponent(privateToken)}` : "";
  const outputBase = `${loadEnv().APP_URL}/f/${feed.outputSlug}`;
  const canManage = currentUser.activeWorkspace.role === "OWNER" || currentUser.activeWorkspace.role === "EDITOR";

  return (
    <div className="feed-detail-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Feed detail</p>
          <div className="feed-detail-title"><h1>{feed.name}</h1><FeedStatusBadge status={feed.status} /></div>
          <p><a className="source-link" href={feed.sourceUrl} rel="noreferrer" target="_blank">{feed.sourceUrl}</a></p>
        </div>
      </div>

      <div className="feed-detail-grid">
        <section className="feed-detail-card" aria-labelledby="feed-overview-heading">
          <h2 id="feed-overview-heading">Overview</h2>
          <dl className="feed-facts">
            <div><dt>Items</dt><dd>{feed._count.items}</dd></div>
            <div><dt>Source type</dt><dd>{feed.sourceType.toLowerCase()}</dd></div>
            <div><dt>Last refresh</dt><dd>{feed.lastRefreshedAt ? displayDate(feed.lastRefreshedAt) : "Not refreshed yet"}</dd></div>
            <div><dt>Next refresh</dt><dd>{displayDate(feed.nextRefreshAt)}</dd></div>
            <div><dt>Consecutive failures</dt><dd>{feed.failureCount}</dd></div>
          </dl>
        </section>
        <FeedSettingsPanel
          workspaceId={workspaceId}
          feedId={feed.id}
          feedName={feed.name}
          initialStatus={feed.status}
          visibility={feed.visibility}
          refreshIntervalMinutes={feed.refreshIntervalMinutes}
          canManage={canManage}
        />
      </div>

      <FeedOutputLinks outputUrls={{
        rss: `${outputBase}/rss${suffix}`,
        json: `${outputBase}/json${suffix}`,
        csv: `${outputBase}/csv${suffix}`,
      }} />
      <FeedItemTable items={itemsResult?.items ?? []} />

      <section className="feed-detail-card" aria-labelledby="refresh-history-heading">
        <h2 id="refresh-history-heading">Refresh history</h2>
        {refreshJobs.length ? (
          <ul className="refresh-history">
            {refreshJobs.map((job) => (
              <li key={job.id}>
                <span><strong>{job.status.toLowerCase()}</strong> · {job.trigger.toLowerCase()}</span>
                <span>{displayDate(job.finishedAt ?? job.createdAt)} · {job.itemsNew} new of {job.itemsFound} found</span>
                {job.errorMessage ? <span>{job.errorMessage}</span> : null}
              </li>
            ))}
          </ul>
        ) : <p className="muted-copy">Refresh history will appear after this feed runs.</p>}
      </section>
    </div>
  );
}
