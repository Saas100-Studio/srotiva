import { headers } from "next/headers";

import { FeedCreateForm } from "../../../../components/feed-create-form.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../../../lib/auth/current-user.ts";
import { requireDashboardUser } from "../../../../lib/auth/dashboard.ts";

export default async function NewFeedPage() {
  const requestHeaders = await headers();
  const currentUser = requireDashboardUser(
    await getOptionalCurrentUserFromCookieHeader(requestHeaders.get("cookie")),
  );

  return (
    <section className="feed-create-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Create feed</p>
          <h1>Start with a URL</h1>
          <p>Paste a public website or RSS/Atom feed to preview its latest items.</p>
        </div>
      </div>
      <FeedCreateForm workspaceId={currentUser.activeWorkspace.id} />
    </section>
  );
}
