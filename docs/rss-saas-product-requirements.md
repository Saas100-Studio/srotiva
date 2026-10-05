# Srotiva Product Requirements: RSS.app-Like Feed Generation SaaS

Date: 2026-07-08

Owner: Product, architecture, engineering

Scope: A production SaaS that turns websites, native RSS/Atom feeds, newsletters, search/topic sources, and selected social/platform sources into reliable feeds, widgets, alerts, webhooks, and developer-friendly outputs.

Non-goal for v1: AI brief generation, AI summarization, and autonomous insight extraction. These can be future add-on modules after the feed engine, delivery surfaces, limits, and monitoring are dependable.

## Evidence Base

This document uses public product and documentation evidence as the boundary for RSS.app parity. It intentionally separates "observed competitor capability" from "recommended implementation."

Primary RSS.app sources:

- RSS.app home describes the core value as custom feeds for any website and social media, widgets, and auto-posting to Discord, Slack, Telegram, and email: https://rss.app/
- RSS.app pricing exposes plan limits and feature groups: feeds, posts per feed, refresh rate, widgets, alerts, webhooks, filters, bundles, collections, OPML/CSV, API access, team collaboration, UTM tags, affiliate tags, image proxy, custom CSS, widget analytics, and widget security: https://rss.app/pricing
- RSS.app API docs show REST API conventions, API key auth, errors, pagination, feeds, bundles, settings, webhooks, and signed webhook verification: https://rss.app/docs/api and https://rss.app/docs/api/webhooks
- RSS.app Visual RSS Builder page documents the workflow: load website, point and click title/image/description elements, preview items, generate feed, support JavaScript-heavy pages, and manual refresh: https://rss.app/rss-feed/rss-builder
- RSS.app generator guide documents XML, JSON, CSV outputs, scheduled fetch, item identification, deduplication, endpoint refresh, retries, stable feed URLs, JS rendering, and public-page limitation: https://rss.app/guides/rss-generator
- RSS.app widget guide documents widgets as dynamic feed display surfaces using feed URLs, generated feeds, native feeds, bundled feeds, async externally hosted embeds, layout formats, and responsive customization: https://rss.app/guides/rss-widgets
- RSS.app bots guide documents feed-to-channel delivery to Slack, Discord, Telegram, and email: https://rss.app/guides/rss-bots
- RSS.app bundles page documents merging feeds, filtering, widgets, and alerts for bundles: https://rss.app/feed-bundles
- RSS.app newsletter page documents private signup email addresses, newsletter catalog, bundles, widgets, collections, and filtering: https://rss.app/tools/newsletter-to-rss-feed-email-feed
- RSS.app JSON and CSV tool pages document preview, save, one-click export, multiple formats, and API/workflow usage: https://rss.app/tools/rss-to-json and https://rss.app/tools/rss-to-csv

Competitor and adjacent-product sources:

- Feedly positions itself as a news reader for following sources, newsletters, Google News, boards, search, mobile reading, and privacy: https://feedly.com/news-reader
- Feedly team docs distinguish team feeds, RSS feeds, AI feeds, and boards for enterprise organization: https://docs.feedly.com/article/770-how-team-feeds-boards-and-personal-feeds-work-in-feedly
- Inoreader highlights filters, rules, tags, folders, collaboration, brand/patent/regulatory monitoring, web feeds, track changes, newsletters, social feeds, and API on paid/custom tiers: https://www.inoreader.com/ and https://www.inoreader.com/pricing
- FetchRSS documents a visual RSS builder for almost any web page, unique feed URLs, automatic updates, social media source URLs, RSS/Atom/JSON/CSV, filters, and modification rules: https://fetchrss.com/
- RSSHub is an open-source extensible route-based feed generator capable of generating RSS from many sources: https://rsshub.netlify.app/
- FiveFilters Feed Creator generates RSS and JSON feeds from page items or links, with hosted/custom managed feed options: https://createfeed.fivefilters.org/
- Zapier RSS supports triggering workflows from feed items and creating RSS feed items, with documented data-size and feed-management limits: https://help.zapier.com/hc/en-us/articles/8496290390157-Add-items-to-an-RSS-feed-in-a-Zap
- IFTTT RSS Feed service supports Applets for RSS and Atom feeds and notification/email actions: https://ifttt.com/feed
- RSS API is a developer product for parsing, normalizing, combining, validating, detecting, subscribing to feeds, and sending webhooks: https://rssapi.net/ and https://rssapi.net/pricing

Security and legal reference sources:

- OWASP SSRF prevention guidance: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- Robots Exclusion Protocol RFC 9309: https://www.rfc-editor.org/info/rfc9309/

## 1. Product Summary

Srotiva lets users create dependable machine-readable feeds from web pages, existing RSS/Atom feeds, newsletters, search/topic sources, and selected social/platform URLs, then reuse those feeds as RSS, JSON, CSV, widgets, webhooks, alerts, and API data.

In simple language: users paste a URL or choose a source, Srotiva detects or builds a feed, keeps it refreshed, filters noise, removes duplicates, and sends updates where the user needs them.

Target customers:

- Marketers and PR teams monitoring brands, competitors, campaigns, and media mentions.
- Researchers, analysts, legal, policy, VC, security, and finance teams tracking external signals.
- Agencies building client dashboards, social walls, and content hubs.
- Developers needing normalized feed data, webhooks, JSON, CSV, and APIs.
- Internal communications teams piping company, customer, social, and industry updates into Slack, Discord, Telegram, email, intranets, or websites.

Core value proposition:

- Convert messy changing web content into reliable structured feeds.
- Control what gets through using filters, deduplication, curation, and limits.
- Deliver updates to humans, websites, and systems without manual checking.
- Make the product billable, monitorable, secure, and operable at SaaS scale.

## 2. User Personas

### Marketing Manager

Use case: Track competitor blogs, pricing pages, launches, social posts, and Google News mentions.

Workflow: Create feeds from competitor URLs and keywords, add blacklist/whitelist filters, bundle by competitor, send alerts to Slack, create weekly CSV exports for reporting.

Success: Fewer missed updates, lower monitoring labor, clean team notifications.

### PR and Communications Team

Use case: Monitor brand mentions, executive names, product launches, regional news, and press coverage.

Workflow: Create Google News/topic feeds, create bundles by brand or geography, use email digest and Slack alerts, export CSV for coverage reporting.

Success: Fast awareness, auditable coverage lists, no noisy inbox.

### Researcher or Analyst

Use case: Track government sites, journals, regulatory updates, patents, market-moving news, and newsletters.

Workflow: Use native feeds where available, visual builder for pages without RSS, newsletter-to-RSS for email-only sources, tags/collections for curated datasets.

Success: High-signal chronological archive with reliable source links and timestamps.

### Agency Operator

Use case: Build and maintain feeds, widgets, and news walls for multiple clients.

Workflow: Workspace per client, templates for widgets, domain allowlists, usage dashboards, role-based access, billing controls.

Success: Repeatable client delivery, scoped permissions, predictable margins.

### Developer or Automation Builder

Use case: Consume normalized feed data, receive webhooks, integrate feeds into apps, ETL, dashboards, or workflow tools.

Workflow: Create API key, create feed by URL/API, subscribe webhook to feed/bundle, verify signatures, use JSON endpoint, monitor delivery logs.

Success: Stable API contract, idempotent webhooks, rate-limit clarity, observability.

### Content Creator or Publisher

Use case: Curate industry articles, create public collections, embed dynamic lists or magazines.

Workflow: Create source feeds, pin posts, moderate collections, configure widget layouts, add UTM/affiliate tags.

Success: Fresh website sections without manual CMS edits.

### Internal Communications Lead

Use case: Bring company blog posts, customer feedback, social mentions, industry news, and release updates into internal channels.

Workflow: Build bundles, configure Slack/Teams-like channels when supported, send daily email digest, use admin audit logs for changes.

Success: Teams see relevant information in existing workspaces.

### SaaS Admin / Support Operator

Use case: Keep feed jobs healthy, investigate failures, manage abuse, assist customers.

Workflow: Admin dashboard for users, workspaces, feeds, queue health, crawler errors, webhook logs, impersonation with audit logs.

Success: Low support time, fast diagnosis, safe operational controls.

### Competitive Positioning

Srotiva should not begin as a broad personal RSS reader. The market evidence suggests three adjacent categories:

| Product | Observed strengths | Product lesson for Srotiva |
| --- | --- | --- |
| RSS.app | Feed generation, visual builder, widgets, bots, bundles, filters, exports, API/webhooks, pricing-gated limits | Primary parity target for a generator and delivery SaaS |
| Feedly | Reader, newsletters, Google News, boards, search, teams, enterprise intelligence | Good inspiration for saved views and team organization, but not the v1 wedge |
| Inoreader | Reader plus filters/rules, web feeds, track changes, newsletters, social feeds, API/custom tiers | Strong reference for power-user filtering and monitoring workflows |
| FetchRSS | Visual builder, auto-updated generated feeds, unique feed URLs, social URL feeds, RSS/Atom/JSON/CSV, filters | Direct generator competitor; proves point-and-click builder expectations |
| RSSHub | Open-source route-based source adapters for many platforms | Useful architectural pattern for platform-specific sources and community routes |
| FiveFilters | CSS-selector feed creation, RSS/JSON outputs, managed custom feeds | Useful for advanced selector mode and custom managed feed services |
| Zapier RSS | RSS triggers and feed item creation inside workflow automation | Srotiva should integrate with Zapier/Make rather than trying to replace them |
| IFTTT RSS | Simple applet triggers for RSS/Atom to notifications/email | Srotiva should provide clean feeds and webhooks that these tools can consume |
| RSS API | Feed parser/subscription API with webhooks, validation, detection, combine, pricing by subscriptions/parses | Reference for developer API packaging and usage-based limits |

Recommended approach:

1. Build a feed-generation SaaS first: URL to feed, native feed support, parser, scheduler, output endpoints, filters, dashboard.
2. Add delivery surfaces second: widgets, webhooks, Slack/Discord/Telegram/email, API keys.
3. Add advanced builder and platform adapters after core reliability: visual selector recipes, social-specific sources, teams, admin, enterprise.

Alternative approaches considered:

- Reader-first: faster UI value, but competes directly with mature readers and delays the harder differentiated engine.
- API-first only: attractive to developers, but misses no-code users and widget/bot revenue.
- Widget-first: visible and marketable, but widgets depend on reliable feeds and filters.

Recommendation: engine-first with no-code surfaces. This maximizes product defensibility and keeps every later surface powered by the same feed truth.

## 3. Complete Feature Breakdown

### Coverage Map

Exact requested feature inventory covered in this section: Account registration and login; Workspace/team management; Feed creation from website URL; Native RSS/Atom feed support; Visual RSS builder; Social feed sources; Google News/topic/keyword feeds; Newsletter-to-RSS; Feed dashboard; Feed preview; Feed refresh and scheduling; Manual refresh; Feed parser; Feed deduplication; Keyword whitelist/blacklist filters; Advanced filter rules; Duplicate/similar post removal; Missing-field filtering; Pinned posts; Feed customization; Feed translation; Bundles/aggregated feeds; Collections/manual curation; RSS output; JSON output; CSV export; OPML import/export; Webhooks; API access; Slack alerts; Telegram alerts; Discord alerts; Email digests; Embeddable website widgets; feed widget, list, news wall, carousel, ticker, image board, magazine; Widget customization; Widget embed script; Widget analytics; UTM tags; Affiliate tags; Billing and subscription limits; Admin dashboard; Abuse prevention; Monitoring and error handling; Support/help center basics.

| Requested feature | Primary feature card |
| --- | --- |
| Account registration and login | Identity and access |
| Workspace/team management | Workspace and team management |
| Feed creation from website URL | Feed creation from URL |
| Native RSS/Atom feed support | Native feed ingestion and parser |
| Visual RSS builder | Visual RSS builder |
| Social feed sources | Platform-specific source adapters |
| Google News/topic/keyword feeds | Search and topic feeds |
| Newsletter-to-RSS | Newsletter-to-RSS |
| Feed dashboard, preview, refresh, scheduling, manual refresh | Feed operations dashboard |
| Feed parser | Native feed ingestion and parser |
| Deduplication, keyword filters, advanced filter rules, similar removal, missing-field filtering | Filtering and deduplication |
| Pinned posts, customization, translation optional | Feed customization |
| Bundles/aggregated feeds | Bundles |
| Collections/manual curation | Collections and moderation |
| RSS, JSON, CSV, OPML | Outputs and import/export |
| Webhooks, API access | Developer API and webhooks |
| Slack, Telegram, Discord, email digests | Alerts and notifications |
| Embeddable widgets, widget types, customization, embed script, analytics | Widget system |
| UTM tags, affiliate tags | Link enrichment |
| Billing and subscription limits | Billing and limits |
| Admin dashboard | Admin operations |
| Abuse prevention, monitoring, error handling | Trust, safety, observability |
| Support/help center basics | Support operations |

### 4.1 Identity and Access

Description: User registration, login, password reset, email verification, OAuth, sessions, API key ownership, and basic account settings.

User story: As a user, I can create an account and securely access my feeds, widgets, integrations, and billing.

Functional requirements:

- Email/password signup with verification.
- OAuth login for Google and GitHub in v1.1.
- Password reset and session revocation.
- MFA for Pro/Enterprise.
- User profile, timezone, notification preferences.
- Workspace membership awareness after login.

Edge cases:

- Duplicate email with OAuth and password login.
- Unverified user creates a feed during trial.
- User leaves last workspace.
- Suspicious login or leaked password detection.

Backend requirements:

- Auth provider or auth service.
- Session cookies with secure, HTTP-only flags.
- Role and workspace claims in access layer.
- Audit logs for login, password reset, MFA changes.

Frontend requirements:

- Signup, login, reset, verify email, account settings.
- Clear trial and limit state after signup.
- Workspace switcher after login.

Database entities: `users`, `workspaces`, `workspace_members`, `api_keys`, `audit_logs`.

API endpoints: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/password/reset`, `GET /me`, `PATCH /me`, `GET /sessions`, `DELETE /sessions/{id}`.

Background jobs: Send verification email, send password reset, suspicious login alert.

Acceptance criteria:

- A verified user can sign up, log in, create a default workspace, and see an empty dashboard.
- Password reset expires and cannot be reused.
- Account events are audited.

### 4.2 Workspace and Team Management

Description: Multi-tenant workspace model for teams, agencies, clients, and enterprise accounts.

User story: As an agency owner, I can create separate workspaces for clients and invite teammates with scoped roles.

Functional requirements:

- Default personal workspace.
- Workspace creation, rename, logo, billing email.
- Roles: owner, admin, editor, viewer, billing, support.
- Invitations with expiration and resend.
- Team member limits by plan.
- Enterprise SSO placeholder fields for future.

Edge cases:

- Removing the last owner.
- Invited email already belongs to another workspace.
- Downgrade below current member count.
- Suspended workspace should block jobs and public endpoints as configured.

Backend requirements:

- Tenant isolation on every query.
- Role-based access middleware.
- Workspace billing ownership and transfer.

Frontend requirements:

- Workspace settings, members table, invite modal, role selector.
- Workspace usage summary.

Database entities: `workspaces`, `workspace_members`, `users`, `subscriptions`, `usage_limits`, `audit_logs`.

API endpoints: `GET /workspaces`, `POST /workspaces`, `PATCH /workspaces/{id}`, `GET /workspaces/{id}/members`, `POST /workspaces/{id}/invites`, `PATCH /workspaces/{id}/members/{memberId}`, `DELETE /workspaces/{id}/members/{memberId}`.

Background jobs: Invite email, member cleanup, usage recalculation.

Acceptance criteria:

- Role permissions are enforced server-side.
- Owners can invite and remove members within plan limits.
- Audit log records membership changes.

### 4.3 Feed Creation From Website URL

Description: Create a generated feed from a public webpage when native RSS is absent or insufficient.

User story: As a marketer, I paste a competitor blog URL and get a stable RSS/JSON/CSV feed that refreshes automatically.

Functional requirements:

- URL validation and canonicalization.
- Native feed discovery first.
- Sitemap and metadata discovery.
- HTML fetch and extraction.
- JS render option when static fetch misses items.
- Feed preview before save.
- Title, description, image, date, author, canonical URL extraction.
- Stable public output URLs.

Edge cases:

- Invalid URL, private IP, localhost, redirects, login pages.
- Paywalls and authenticated content.
- Anti-bot challenges.
- Pages with no repeated items.
- Infinite scroll and API-backed pages.
- Layout changes after feed creation.

Backend requirements:

- Fetcher service, SSRF guard, robots policy checker, extraction pipeline, recipe store.
- Host rate limits and crawl politeness.
- Feed health status.

Frontend requirements:

- URL input, discovery progress, preview, source type choice, save feed.
- Clear errors for unsupported pages.

Database entities: `feeds`, `feed_sources`, `feed_items`, `feed_refresh_jobs`, `error_logs`.

API endpoints: `POST /feeds/discover`, `POST /feeds`, `GET /feeds/{id}`, `POST /feeds/{id}/refresh`.

Background jobs: Initial fetch, extraction, item normalization, scheduled refresh, retry.

Acceptance criteria:

- User can create a feed from a public news/blog page in under one minute.
- Feed exposes RSS, JSON, and CSV endpoints after save.
- Unsafe URLs are blocked before fetch.

### 4.4 Native Feed Ingestion and Parser

Description: Parse and normalize existing RSS, Atom, RDF, and JSON Feed inputs.

User story: As a developer, I can save a native RSS feed and receive normalized JSON and webhooks without writing my own parser.

Functional requirements:

- Detect RSS, Atom, RDF, JSON Feed.
- Validate feed structure.
- Normalize item fields.
- Preserve original XML fields where useful in `raw`.
- Conditional fetch with ETag and Last-Modified.
- Handle malformed feeds leniently with warnings.

Edge cases:

- Missing GUID, missing dates, invalid XML, wrong content type.
- Duplicate items with changed URLs.
- Huge feeds, slow feeds, gzip/encoding issues.
- Feeds that reorder old items.

Backend requirements:

- Parser library with tolerant mode.
- Item fingerprinting.
- Feed metadata refresh.
- XML/JSON/CSV renderer.

Frontend requirements:

- Native feed preview, validation warnings, item table.

Database entities: `feeds`, `feed_sources`, `feed_items`, `feed_refresh_jobs`, `error_logs`.

API endpoints: `POST /feeds`, `GET /feeds/{id}/items`, `GET /public/feeds/{slug}.xml`, `GET /public/feeds/{slug}.json`, `GET /public/feeds/{slug}.csv`.

Background jobs: Poll native feed, detect changes, emit events.

Acceptance criteria:

- Valid RSS and Atom feeds save successfully.
- Duplicate entries are not re-alerted.
- Malformed but recoverable feeds show warnings, not silent failure.

### 4.5 Visual RSS Builder

Description: Point-and-click builder for websites where automatic extraction fails or the user wants precise content selection.

User story: As a non-technical user, I can load a webpage, click the title/image/description/date/link elements, preview extracted posts, and save a recipe.

Functional requirements:

- Isolated page preview.
- Element picker for item container, title, link, image, description, author, date.
- Generated CSS selectors with fallback selector candidates.
- Selector testing across multiple detected items.
- Recipe save and re-run during refresh.
- JS rendering option.
- Layout-change detection.

Edge cases:

- Cross-origin restrictions.
- Sites that deny embedding.
- Shadow DOM, iframes, infinite scroll.
- User selects a single item rather than repeated item group.
- Selectors match ads/navigation.
- Date is missing or relative.

Backend requirements:

- Browser automation workers.
- Screenshot/DOM capture service.
- Recipe validator and extractor.
- Secure outbound browsing with network restrictions.

Frontend requirements:

- Builder wizard, page preview, highlight overlay, field mapping sidebar, extracted preview table, save recipe.

Database entities: `feeds`, `feed_sources`, `feed_items`, `feed_refresh_jobs`, `error_logs`.

API endpoints: `POST /builder/sessions`, `GET /builder/sessions/{id}`, `POST /builder/sessions/{id}/select`, `POST /builder/sessions/{id}/test`, `POST /builder/sessions/{id}/save`.

Background jobs: Browser load, selector test, recipe refresh.

Acceptance criteria:

- User can create a working feed from a page with no native RSS using selectors.
- Saved recipe refreshes without opening the builder.
- Broken selectors mark feed degraded and notify owner.

### 4.6 Platform-Specific Source Adapters

Description: Source adapters for YouTube, Reddit, X/Twitter, Instagram, TikTok, LinkedIn, Facebook, Telegram, Threads, Bluesky, Pinterest, eBay, and other sources when legally and technically supportable.

User story: As a social media manager, I can paste a public profile/channel/community URL and create a feed of recent public posts.

Functional requirements:

- Source URL classification.
- Adapter interface per platform.
- Prefer official public RSS/API when available.
- Support adapter-specific fields.
- Clearly mark unstable or limited adapters.
- Enforce terms, rate limits, auth requirements, and legal review.

Edge cases:

- Platform blocks scraping or requires login.
- API quota exhaustion.
- Deleted/private posts.
- Media hotlinking restrictions.
- Region-specific content.
- Platform terms prohibit automated collection.

Backend requirements:

- Adapter registry.
- Per-platform rate limits and credentials.
- Feature flags for unstable sources.
- Legal/terms review gate.

Frontend requirements:

- Source-specific creation screens, warnings, preview, unsupported-state copy.

Database entities: `feeds`, `feed_sources`, `integrations`, `feed_items`, `error_logs`.

API endpoints: `GET /sources/supported`, `POST /feeds/discover`, `POST /feeds`.

Background jobs: Adapter refresh, token refresh when applicable, health checks.

Acceptance criteria:

- Supported platform URLs are classified and previewed.
- Unsupported or prohibited URLs fail with clear explanation.
- Adapter failures do not affect other feeds.

### 4.7 Search and Topic Feeds

Description: Keyword/topic feeds, especially Google News-like feeds, for monitoring public news and trends.

User story: As a PR user, I can create a feed for a brand keyword and get new matching news items.

Functional requirements:

- Keyword query, language, region, source filters.
- Google News RSS URL generation where available.
- Query preview and save.
- Dedup across similar syndications.
- Optional exact-match and negative terms.

Edge cases:

- Ambiguous keywords.
- Syndicated duplicate articles.
- Search provider rate limits.
- Non-news results or spam.

Backend requirements:

- Query builder, feed fetcher, dedup rules, source metadata.

Frontend requirements:

- Query builder form, preview, quality hints.

Database entities: `feeds`, `feed_sources`, `feed_filters`, `feed_items`.

API endpoints: `POST /feeds/search-preview`, `POST /feeds`.

Background jobs: Search feed polling, dedup.

Acceptance criteria:

- User can create a query feed with region/language.
- Duplicate syndicated stories collapse or are marked similar.

### 4.8 Newsletter-to-RSS

Description: Convert email newsletters into feed items using private generated email addresses.

User story: As a researcher, I subscribe to newsletters with a Srotiva address and read/filter them as feed items.

Functional requirements:

- Unique inbound email address per newsletter feed.
- Inbound email parsing and sanitization.
- Sender allowlist/blocklist.
- Unsubscribe metadata capture when present.
- Attachments/media handling policy.
- Convert subject/body/date/sender into feed item.

Edge cases:

- Spam, malware, huge attachments.
- Forwarded emails.
- Duplicate newsletter resend.
- HTML tracking pixels.
- Bounce storms.

Backend requirements:

- Inbound email provider, MIME parser, sanitizer, spam controls.
- Storage for sanitized HTML and media references.

Frontend requirements:

- Generated email display, copy button, allowed senders, preview, newsletter health.

Database entities: `feeds`, `feed_sources`, `feed_items`, `feed_filters`, `error_logs`.

API endpoints: `POST /newsletter-feeds`, `GET /newsletter-feeds/{id}/address`, provider webhook `/inbound/email`.

Background jobs: Email parse, spam scan, media proxy/cache, notifications.

Acceptance criteria:

- New email to generated address becomes a feed item.
- Tracking scripts are removed.
- Spam and oversized messages are rejected or quarantined.

### 4.9 Feed Operations Dashboard

Description: Central feed management surface for saved feeds, previews, scheduling, refresh, health, logs, and outputs.

User story: As an operator, I can see every feed, when it last refreshed, if it is failing, what changed, and where it is delivered.

Functional requirements:

- Feed list with status, source, refresh interval, last/next refresh, item count, plan limit.
- Feed detail with preview, output links, filters, integrations, logs.
- Manual refresh with throttling.
- Pause/resume feed.
- Health diagnosis and repair suggestions.

Edge cases:

- User spams manual refresh.
- Feed has no new items for weeks.
- Source repeatedly fails.
- Plan downgrade makes interval invalid.

Backend requirements:

- Job state machine.
- Refresh scheduler.
- Health scoring.
- Manual refresh quota.

Frontend requirements:

- Dashboard table, feed detail, item preview, manual refresh button, health banner.

Database entities: `feeds`, `feed_refresh_jobs`, `feed_items`, `usage_limits`, `error_logs`.

API endpoints: `GET /feeds`, `GET /feeds/{id}`, `GET /feeds/{id}/items`, `POST /feeds/{id}/refresh`, `PATCH /feeds/{id}`.

Background jobs: Scheduled refresh, stale-feed scan, failure notification.

Acceptance criteria:

- Users can inspect current feed output before sharing it.
- Manual refresh enforces plan and abuse limits.
- Failed feeds show actionable error states.

### 4.10 Filtering and Deduplication

Description: Keyword whitelist/blacklist, advanced rules, duplicate/similar post removal, missing-field filters, and global/bundle-level filters.

User story: As a PR team, I can remove irrelevant articles and only alert on items matching my brand and product terms.

Functional requirements:

- Per-feed filters.
- Workspace global filters.
- Bundle filter inheritance.
- Whitelist and blacklist keywords.
- Field-specific rules: title, description, URL, author, source, date.
- Missing-field filters: require image/date/link/title.
- Duplicate and similar removal.
- Preview filter impact before save.

Edge cases:

- Whitelist and blacklist conflict.
- Case sensitivity and stemming.
- False positive similar matching.
- Filtering removes all items.
- Rules changed after alerts already sent.

Backend requirements:

- Rule evaluator with deterministic order.
- Item fingerprint and similarity hashes.
- Filter explainability metadata.

Frontend requirements:

- Rule builder, keyword lists, impact preview, filter inheritance display.

Database entities: `feed_filters`, `feed_items`, `feeds`, `bundles`.

API endpoints: `GET /feeds/{id}/filters`, `POST /feeds/{id}/filters`, `PATCH /filters/{id}`, `POST /filters/test`.

Background jobs: Refilter feed, rebuild bundle output.

Acceptance criteria:

- User sees why an item was included/excluded.
- Duplicate items do not trigger duplicate webhooks/alerts.
- Missing required fields can block output.

### 4.11 Feed Customization and Link Enrichment

Description: Customize feed title, description, author, item limits, pinned posts, image proxy behavior, optional translation, UTM tags, and affiliate tags.

User story: As a publisher, I can shape a feed so it looks right in widgets and downstream apps.

Functional requirements:

- Editable title, description, icon, author.
- Post limit by plan.
- Pin selected posts.
- Sort order controls.
- Image proxy toggle.
- UTM tags and affiliate query parameters.
- Optional translation module behind feature flag.

Edge cases:

- Affiliate/UTM conflicts with existing query parameters.
- Pinned item deleted from source.
- Translation changes item meaning.
- Image proxy cache misses or copyright constraints.

Backend requirements:

- Feed renderer respects customization.
- Link transformation pipeline.
- Image proxy service with cache and allow/deny rules.
- Translation provider abstraction if enabled.

Frontend requirements:

- Feed settings, link enrichment form, pinned post manager, output preview.

Database entities: `feeds`, `feed_items`, `widget_configs`, `usage_limits`.

API endpoints: `PATCH /feeds/{id}/settings`, `POST /feeds/{id}/items/{itemId}/pin`, `DELETE /feeds/{id}/items/{itemId}/pin`.

Background jobs: Output regeneration, image cache warm, optional translation.

Acceptance criteria:

- Public feed output reflects settings.
- UTM/affiliate tags are applied consistently and reversibly.
- Pinned posts appear according to configured order.

### 4.12 Bundles

Description: Aggregated feeds combining multiple feeds into one unified feed, widget, alert source, or API resource.

User story: As an agency user, I can merge all client news sources into one bundle and embed it as a news wall.

Functional requirements:

- Create bundle, add/remove feeds, reorder, set limits.
- Bundle RSS/JSON/CSV endpoints.
- Bundle filters and inherited feed filters.
- Bundle health based on member feeds.
- Convert bundle to feed-like destination.

Edge cases:

- Same item appears in multiple feeds.
- Removed feed had items in bundle history.
- Feed and bundle filter conflict.
- Bundle exceeds plan item limit.

Backend requirements:

- Bundle materialization or query-time merge.
- Cross-feed dedup.
- Bundle output renderer.

Frontend requirements:

- Bundle builder, source feed picker, preview, filter inheritance UI.

Database entities: `bundles`, `feeds`, `feed_items`, `feed_filters`.

API endpoints: `POST /bundles`, `GET /bundles`, `GET /bundles/{id}`, `PUT /bundles/{id}/feeds/{feedId}`, `DELETE /bundles/{id}/feeds/{feedId}`.

Background jobs: Bundle rebuild on source feed update, bundle webhook events.

Acceptance criteria:

- Bundle endpoint shows merged items in correct order.
- Duplicate items across sources are removed or linked.
- Bundle can power widget and alerts.

### 4.13 Collections and Moderation

Description: Manual curation layer where users hand-pick feed items into curated collections.

User story: As a content curator, I can choose articles from feeds and publish a curated collection widget or feed.

Functional requirements:

- Create collection.
- Add/remove/reorder items manually.
- Notes/tags for internal use.
- Moderation states: draft, approved, hidden.
- Collection RSS/JSON/widget output.
- Plan-specific item limits.

Edge cases:

- Source item deleted but collection item remains.
- Duplicate manual additions.
- Approver and editor roles conflict.

Backend requirements:

- Snapshot selected item data to preserve collection output.
- Moderation audit log.

Frontend requirements:

- Collection board, item picker, drag reorder, approval controls.

Database entities: `collections`, `collection_items`, `feed_items`, `audit_logs`.

API endpoints: `POST /collections`, `GET /collections/{id}`, `POST /collections/{id}/items`, `PATCH /collections/{id}/items/{itemId}`, `DELETE /collections/{id}/items/{itemId}`.

Background jobs: Collection output refresh, moderation notifications.

Acceptance criteria:

- Collection output is stable even when source feed changes.
- Only authorized roles can approve/publish.

### 4.14 Outputs and Import/Export

Description: RSS XML, Atom where useful, JSON, CSV, OPML import/export, and feed preview endpoints.

User story: As a developer or analyst, I can use the same feed in a reader, app, spreadsheet, or automation tool.

Functional requirements:

- Stable public URLs for RSS, JSON, CSV.
- Private tokenized URLs for private feeds.
- OPML import and export.
- CSV download and direct CSV link.
- JSON output with normalized schema.
- HTTP caching headers.

Edge cases:

- Feed is private but widget is public.
- OPML duplicates.
- CSV injection concerns.
- Huge export size.

Backend requirements:

- Renderer service.
- Access-token checks.
- Export queue for large exports.
- CSV sanitization.

Frontend requirements:

- Output links panel, copy buttons, export buttons, import wizard.

Database entities: `feeds`, `bundles`, `collections`, `feed_items`, `api_keys`.

API endpoints: `GET /public/feeds/{slug}.xml`, `GET /public/feeds/{slug}.json`, `GET /public/feeds/{slug}.csv`, `POST /imports/opml`, `GET /exports/opml`, `POST /exports/csv`.

Background jobs: OPML import, large CSV export, endpoint cache invalidation.

Acceptance criteria:

- RSS validates in standard feed readers.
- JSON and CSV update when feed items update.
- OPML import reports created, skipped, and failed feeds.

### 4.15 Developer API and Webhooks

Description: Programmatic feed, bundle, item, settings, webhook, and usage management.

User story: As a developer, I can create feeds via API and receive signed webhooks when new items appear.

Functional requirements:

- API keys scoped to workspace.
- REST API with pagination, errors, idempotency keys for create/delivery actions.
- Webhook subscriptions for feed, bundle, or all workspace feeds.
- Webhook signing using timestamp and HMAC.
- Delivery retries, history, test event.
- Rate limits by plan.

Edge cases:

- User rotates API key.
- Webhook endpoint times out.
- Endpoint returns 410 or repeated 5xx.
- Replay attacks.
- Duplicate event delivery.

Backend requirements:

- API gateway or middleware.
- Key hashing and scope checks.
- Delivery queue, retry policy, signature generation, event log.

Frontend requirements:

- API key manager, webhook manager, delivery logs, test webhook button.

Database entities: `api_keys`, `webhooks`, `webhook_deliveries`, `feeds`, `bundles`, `usage_limits`, `audit_logs`.

API endpoints: `POST /api-keys`, `DELETE /api-keys/{id}`, `POST /webhooks`, `GET /webhooks/{id}/deliveries`, `POST /webhooks/{id}/test`, REST feed/bundle endpoints in Section 7.

Background jobs: Webhook delivery, retry, disable unhealthy endpoint, usage rollup.

Acceptance criteria:

- Webhook payloads include event ID, feed metadata, new items, changed items.
- Receivers can verify signatures.
- Failed deliveries are visible and retried with backoff.

### 4.16 Alerts and Notifications

Description: Slack, Telegram, Discord, and email digest destinations.

User story: As an internal comms lead, I can send new feed items to a team channel and receive a daily digest.

Functional requirements:

- Connect Slack workspace and choose channel.
- Connect Discord webhook or bot.
- Connect Telegram bot/channel.
- Configure email digests: immediate, daily, weekly.
- Destination-specific formatting with title, description, image, source, date.
- Filter by feed or bundle.
- Alert limits per platform by plan.

Edge cases:

- OAuth token revoked.
- Channel deleted.
- Bot lacks permission.
- Destination rate limited.
- Email bounces.

Backend requirements:

- Integration credentials vault.
- Notification formatter.
- Delivery queue and logs.
- Bounce handling.

Frontend requirements:

- Integration setup flows, channel picker where supported, message preview, delivery logs.

Database entities: `integrations`, `alerts`, `email_digests`, `feed_items`, `webhook_deliveries`, `error_logs`.

API endpoints: `POST /integrations/slack/connect`, `POST /integrations/discord`, `POST /integrations/telegram`, `POST /alerts`, `POST /email-digests`.

Background jobs: Send alert, send digest, retry, token refresh, bounce processing.

Acceptance criteria:

- New matching item posts to the configured channel once.
- Users can preview message formatting.
- Failed delivery is logged with actionable error.

### 4.17 Widget System

Description: Embeddable website widgets for feed widget, list, news wall, carousel, ticker, image board, and magazine layouts with customization, embed script, analytics, UTM tags, and abuse controls.

User story: As a website owner, I can embed a live news wall that matches my brand and updates automatically.

Functional requirements:

- Widget builder UI.
- Supported types: feed, list, news wall, carousel, ticker, image board, magazine.
- Data source: feed, bundle, or collection.
- Customization: fonts, colors, spacing, layout, title/date/author/image toggles, item count, custom CSS on higher tiers.
- JS embed script and iframe fallback.
- Responsive behavior.
- Widget analytics: views, clicks, CTR, referrer, domain.
- UTM injection.
- Allowed domains and abuse limits.

Edge cases:

- Host site CSP blocks script.
- Widget embedded on abusive domain.
- Huge traffic spike.
- Custom CSS breaks layout.
- Mixed content from HTTP media.

Backend requirements:

- Public widget API, CDN/cache, config renderer, analytics collector, domain validation.
- Image proxy for media reliability.

Frontend requirements:

- Builder, live preview, embed code modal, analytics view, domain settings.

Database entities: `widgets`, `widget_configs`, `widget_views`, `widget_clicks`, `feeds`, `bundles`, `collections`.

API endpoints: `POST /widgets`, `GET /widgets/{id}`, `PATCH /widgets/{id}`, `GET /embed/widget/{publicId}.js`, `GET /embed/widget/{publicId}`, `POST /events/widget-view`, `POST /events/widget-click`.

Background jobs: Cache warm, analytics aggregation, abuse detection.

Acceptance criteria:

- Widget loads asynchronously and does not block host page.
- Widget respects config across desktop and mobile.
- Views and clicks are tracked without collecting unnecessary personal data.

### 4.18 Billing and Limits

Description: Plans, subscriptions, trials, usage tracking, upgrade/downgrade, and over-limit controls.

User story: As a SaaS owner, I can charge customers based on feeds, refresh interval, widgets, webhooks, alerts, API operations, and seats.

Functional requirements:

- Plans: free, starter, developer, pro, enterprise.
- Stripe Checkout/Portal.
- Trial logic.
- Usage metering and limit checks.
- Grace periods and downgrade handling.
- Invoices and billing email.
- Enterprise custom limits.

Edge cases:

- Payment failure.
- Downgrade below usage.
- Trial abuse.
- Subscription canceled while public widgets exist.

Backend requirements:

- Stripe webhooks.
- Entitlement service.
- Usage rollups.
- Workspace suspension/degradation policy.

Frontend requirements:

- Pricing page, billing page, usage meters, upgrade prompts, over-limit warnings.

Database entities: `plans`, `subscriptions`, `usage_limits`, `workspaces`, `audit_logs`.

API endpoints: `GET /plans`, `POST /billing/checkout`, `POST /billing/portal`, `POST /billing/webhook`, `GET /usage`.

Background jobs: Usage rollup, invoice sync, trial expiration, payment failure notices.

Acceptance criteria:

- Plan limits are enforced server-side.
- Stripe status changes update entitlements.
- Downgrades do not delete data without explicit user action.

### 4.19 Admin, Abuse, Monitoring, Support

Description: Internal tooling for safe operations, abuse prevention, monitoring, diagnostics, and help center basics.

User story: As a support admin, I can inspect a failing feed, see crawl errors, replay a job, and help the customer without unsafe database access.

Functional requirements:

- User and workspace search.
- Feed/job diagnostics.
- Queue health dashboard.
- Error logs and webhook logs.
- Plan/subscription admin.
- Abuse reports and source/domain blocks.
- Support impersonation with audit log.
- Help center articles for common workflows.

Edge cases:

- Admin accesses sensitive customer data.
- Impersonation without reason.
- Malicious feed source attacks crawler.
- High-volume abusive account.

Backend requirements:

- Admin RBAC, break-glass controls, audit every admin action.
- Metrics, logs, traces, alerts.
- Abuse classifier and blocklists.

Frontend requirements:

- Admin dashboard, diagnostics detail, impersonation reason modal, help center CMS or static docs.

Database entities: `users`, `workspaces`, `feeds`, `feed_refresh_jobs`, `webhook_deliveries`, `error_logs`, `audit_logs`.

API endpoints: `GET /admin/users`, `GET /admin/workspaces`, `GET /admin/feeds/{id}/diagnostics`, `POST /admin/jobs/{id}/replay`, `POST /admin/impersonations`.

Background jobs: Anomaly detection, queue health checks, status page incidents, help-center search indexing.

Acceptance criteria:

- Admin can diagnose the last failed refresh without direct database access.
- All admin actions are auditable.
- Abuse blocks stop future fetches for blocked targets.

## 4. Product Architecture

### Architecture Diagram

```text
User Browser
  -> Next.js Web App
      -> Backend API / BFF
          -> Auth and Workspace Service
          -> Billing and Entitlements
          -> Feed Management API
          -> Widget Management API
          -> Integration API
          -> Admin API

Backend API
  -> PostgreSQL: core app data, feed metadata, items, jobs, usage
  -> Redis: cache, locks, rate limits, queues
  -> Object Storage: screenshots, media cache, exports, raw fetch snapshots
  -> Search Index: feed item search, admin diagnostics

Scheduler
  -> Queue Workers
      -> URL Safety and Robots Policy
      -> Fetcher Service
      -> Browser Rendering Service
      -> Parser / Extractor Service
      -> Filter / Dedup Engine
      -> Feed Renderer and Cache Invalidation
      -> Webhook Delivery Worker
      -> Notification Worker
      -> Email Digest Worker

Public Delivery Edge
  -> RSS / JSON / CSV endpoints
  -> Widget JS and iframe endpoints
  -> Image Proxy
  -> CDN and cache layer

Observability and Operations
  -> Logs, metrics, traces, error tracking
  -> Admin dashboard
  -> Abuse and rate-limit controls
  -> Status and alerting
```

### Components

Frontend app:

- Next.js app for dashboard, feed builder, widgets, billing, integrations, admin.
- Server-render authenticated pages where useful; client components for builder and previews.

Backend API:

- REST API behind auth and workspace middleware.
- Clear separation between internal APIs and public feed/widget endpoints.

Feed scraping/crawling service:

- Fetches public URLs only after URL safety checks, robots policy, rate limits, and host politeness checks.
- Uses static HTTP first, browser rendering only when needed or selected.

Parser/extractor service:

- Native feed parser for RSS/Atom/RDF/JSON Feed.
- HTML extractor and visual selector recipe runner.
- Normalizes fields to canonical item schema.

Scheduler/queue workers:

- Plan-aware refresh scheduler.
- Priority queues for manual refresh, paid plan refresh, browser jobs, webhooks, emails.

Feed storage:

- PostgreSQL for normalized items and metadata.
- Object storage for raw snapshots, screenshots, media, exports.
- Redis/CDN for public output caches.

Media/image proxy service:

- Fetches and caches allowed media.
- Prevents mixed content and reduces widget breakage.
- Enforces content length/type limits.

Widget delivery service:

- Serves embed JS, iframe, config, and item payloads.
- Uses CDN and short cache TTL with cache invalidation on feed update.

Webhook delivery service:

- Signs payloads.
- Retries with exponential backoff.
- Logs attempts and disables bad endpoints after threshold.

Notification/bot service:

- Sends Slack, Discord, Telegram, and email digest messages.
- Keeps destination-specific formatting isolated from feed engine.

Billing service:

- Stripe integration, entitlements, usage metering, trials, invoices.

Admin service:

- Internal RBAC, diagnostics, job replay, user/workspace management, abuse tooling.

Logging/monitoring:

- Metrics by feed, source host, job status, duration, queue, error class, delivery status.

Rate limiting:

- Per user, workspace, API key, IP, host, destination endpoint, and public widget.

Anti-abuse layer:

- SSRF guard, crawl policy, source/domain blocklists, trial abuse controls, quota enforcement, anomaly detection.

## 5. Suggested Tech Stack

| Layer | Recommendation | Why suitable | Alternatives |
| --- | --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Existing repo is Next; good for dashboard, public endpoints, auth, server components | Remix, SvelteKit |
| Backend API | Next.js route handlers initially, migrate heavy services to NestJS/Fastify workers | Keeps MVP fast while allowing worker separation | FastAPI, Rails, Django |
| Database | PostgreSQL with Prisma or Drizzle | Relational multi-tenant SaaS data, JSONB for recipes/configs, indexes | MySQL, CockroachDB, Neon/Supabase managed Postgres |
| Queue | BullMQ on Redis for MVP; Temporal for complex workflows later | Simple jobs, retries, priorities; Temporal better for long-running durability | Cloud Tasks, SQS, Sidekiq |
| Caching | Redis plus CDN | Rate limits, locks, output cache, widget payload cache | Upstash Redis, KeyDB, Cloudflare KV |
| Object storage | S3-compatible storage | Snapshots, exports, screenshots, media proxy cache | Cloudflare R2, GCS, Azure Blob |
| Browser automation | Playwright in isolated worker pool | JS-rendered pages, visual builder, screenshots | Browserless, Playwright on Kubernetes, Crawlee |
| Feed parsing | `feedparser`, `rss-parser`, `htmlparser2`, `cheerio`, `readability` as needed | Mature parsing/extraction ecosystem | Python `feedparser`, Go feed parsers |
| Search/indexing | Postgres full-text for MVP, Meilisearch/OpenSearch later | Search feed items/admin logs as scale grows | Typesense, Elasticsearch |
| Billing | Stripe | Checkout, subscriptions, customer portal, webhooks | Paddle, Lemon Squeezy, Chargebee |
| Authentication | Auth.js/NextAuth or Clerk | Fast SaaS auth, OAuth, sessions; Clerk speeds teams/MFA | Supabase Auth, WorkOS for enterprise |
| Email | Resend or Postmark | Transactional email and digests | SendGrid, SES |
| Inbound email | Mailgun Routes or Postmark Inbound | Newsletter-to-RSS parsing | SES Inbound, SendGrid Inbound Parse |
| Observability | Sentry, OpenTelemetry, Grafana/Prometheus, structured logs | Error tracking plus worker/API traces | Datadog, New Relic |
| Deployment | Vercel for web, Fly.io/Render/Kubernetes for workers and browser pool | Separate web and long-running workloads | AWS ECS/Fargate, GCP Cloud Run |
| CI/CD | GitHub Actions with lint/test/build/migrations | Standard deploy gate | Vercel CI, Buildkite |

Architecture choice:

- Keep the dashboard and public feed endpoints in Next.js for MVP.
- Run crawler, parser, browser, webhook, notification, and digest jobs as separate worker processes. Do not put crawling in request-response paths beyond short preview jobs.
- Treat the feed engine as a domain service with an internal API so it can be split out later.

## 6. Database Schema

Conventions:

- Primary keys: `uuid`.
- Timestamps: `created_at`, `updated_at`, soft delete via `deleted_at` where needed.
- Tenant key: `workspace_id` on all customer-owned records.
- Important JSON fields use `jsonb` with validation in app code.

### users

Fields:

- `id uuid pk`
- `email citext unique not null`
- `email_verified_at timestamptz`
- `name text`
- `avatar_url text`
- `password_hash text nullable`
- `timezone text default 'UTC'`
- `mfa_enabled boolean default false`
- `last_login_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Unique `users_email_key`.

Relationships:

- One user has many `workspace_members`, `api_keys`, `audit_logs`.

### workspaces

Fields:

- `id uuid pk`
- `name text not null`
- `slug text unique not null`
- `owner_user_id uuid references users(id)`
- `billing_email citext`
- `status text check in ('active','trialing','past_due','suspended','deleted')`
- `logo_url text`
- `settings jsonb default '{}'`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Unique `workspaces_slug_key`.
- Index `workspaces_owner_user_id_idx`.

### workspace_members

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `user_id uuid references users(id)`
- `role text check in ('owner','admin','editor','viewer','billing','support')`
- `invited_by_user_id uuid references users(id)`
- `invited_email citext`
- `invitation_token_hash text`
- `invitation_expires_at timestamptz`
- `joined_at timestamptz`
- `created_at timestamptz`

Indexes:

- Unique `(workspace_id, user_id)`.
- Index `(workspace_id, role)`.

### plans

Fields:

- `id uuid pk`
- `code text unique not null`
- `name text not null`
- `monthly_price_cents integer`
- `annual_price_cents integer`
- `limits jsonb not null`
- `features jsonb not null`
- `is_public boolean default true`
- `created_at timestamptz`

Notes:

- `limits` contains feeds, widgets, webhooks, alert counts, team members, refresh intervals, posts per feed, API operations, etc.

### subscriptions

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `plan_id uuid references plans(id)`
- `stripe_customer_id text`
- `stripe_subscription_id text unique`
- `status text`
- `trial_ends_at timestamptz`
- `current_period_start timestamptz`
- `current_period_end timestamptz`
- `cancel_at_period_end boolean default false`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Unique `stripe_subscription_id`.
- Index `(workspace_id, status)`.

### feeds

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `name text not null`
- `slug text not null`
- `description text`
- `status text check in ('draft','active','paused','degraded','failed','deleted')`
- `visibility text check in ('public','private','unlisted') default 'private'`
- `source_type text check in ('native','webpage','visual','platform','search','newsletter')`
- `source_url text`
- `public_rss_url text`
- `public_json_url text`
- `public_csv_url text`
- `refresh_interval_minutes integer`
- `last_refreshed_at timestamptz`
- `next_refresh_at timestamptz`
- `last_success_at timestamptz`
- `last_failure_at timestamptz`
- `failure_count integer default 0`
- `settings jsonb default '{}'`
- `created_by_user_id uuid references users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`
- `deleted_at timestamptz`

Indexes:

- Unique `(workspace_id, slug)`.
- Index `(workspace_id, status)`.
- Index `(next_refresh_at) where status='active'`.
- Index `(source_url)`.

### feed_sources

Fields:

- `id uuid pk`
- `feed_id uuid references feeds(id)`
- `kind text check in ('url','rss','atom','jsonfeed','sitemap','visual_recipe','platform_adapter','newsletter_address','search_query')`
- `url text`
- `adapter_key text`
- `recipe jsonb`
- `headers jsonb`
- `robots_status text`
- `etag text`
- `last_modified text`
- `last_http_status integer`
- `last_fetch_duration_ms integer`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Index `(feed_id)`.
- Index `(adapter_key)`.

### feed_items

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `feed_id uuid references feeds(id)`
- `source_item_id text`
- `fingerprint text not null`
- `canonical_url text`
- `url text`
- `title text`
- `description_text text`
- `description_html text`
- `author text`
- `authors jsonb default '[]'`
- `image_url text`
- `image_proxy_url text`
- `date_published timestamptz`
- `date_modified timestamptz`
- `raw jsonb`
- `status text check in ('active','filtered','hidden','deleted') default 'active'`
- `filter_reason jsonb`
- `is_pinned boolean default false`
- `first_seen_at timestamptz`
- `last_seen_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Unique `(feed_id, fingerprint)`.
- Index `(workspace_id, feed_id, date_published desc)`.
- Index `(canonical_url)`.
- Full-text index on `title`, `description_text`.

### feed_filters

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `feed_id uuid nullable references feeds(id)`
- `bundle_id uuid nullable references bundles(id)`
- `scope text check in ('workspace','feed','bundle')`
- `name text`
- `type text check in ('whitelist','blacklist','field_rule','missing_field','dedup','similarity')`
- `field text`
- `operator text`
- `value jsonb`
- `is_enabled boolean default true`
- `order_index integer`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Index `(workspace_id, scope, is_enabled)`.
- Index `(feed_id, order_index)`.
- Index `(bundle_id, order_index)`.

### feed_refresh_jobs

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `feed_id uuid references feeds(id)`
- `trigger text check in ('scheduled','manual','initial','retry','admin')`
- `status text check in ('queued','running','succeeded','failed','cancelled')`
- `priority integer`
- `started_at timestamptz`
- `finished_at timestamptz`
- `attempt integer default 0`
- `items_found integer default 0`
- `items_new integer default 0`
- `items_changed integer default 0`
- `error_code text`
- `error_message text`
- `metadata jsonb default '{}'`
- `created_at timestamptz`

Indexes:

- Index `(feed_id, created_at desc)`.
- Index `(status, priority, created_at)`.
- Index `(workspace_id, status)`.

### bundles

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `name text not null`
- `slug text not null`
- `description text`
- `status text default 'active'`
- `settings jsonb default '{}'`
- `created_by_user_id uuid references users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Unique `(workspace_id, slug)`.

Join table `bundle_feeds`:

- `bundle_id uuid references bundles(id)`
- `feed_id uuid references feeds(id)`
- `order_index integer`
- Unique `(bundle_id, feed_id)`.

### collections

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `name text not null`
- `slug text not null`
- `description text`
- `status text check in ('draft','published','archived')`
- `settings jsonb default '{}'`
- `created_by_user_id uuid references users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Unique `(workspace_id, slug)`.

### collection_items

Fields:

- `id uuid pk`
- `collection_id uuid references collections(id)`
- `feed_item_id uuid nullable references feed_items(id)`
- `snapshot jsonb not null`
- `status text check in ('draft','approved','hidden')`
- `note text`
- `order_index integer`
- `added_by_user_id uuid references users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Index `(collection_id, order_index)`.
- Unique `(collection_id, feed_item_id)` where `feed_item_id is not null`.

### widgets

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `public_id text unique not null`
- `name text`
- `source_type text check in ('feed','bundle','collection')`
- `source_id uuid not null`
- `type text check in ('feed','list','news_wall','carousel','ticker','image_board','magazine')`
- `status text check in ('active','paused','deleted')`
- `allowed_domains text[]`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Unique `public_id`.
- Index `(workspace_id, status)`.

### widget_configs

Fields:

- `id uuid pk`
- `widget_id uuid references widgets(id)`
- `version integer`
- `config jsonb not null`
- `custom_css text`
- `created_at timestamptz`

Indexes:

- Unique `(widget_id, version)`.

### widget_views

Fields:

- `id uuid pk`
- `widget_id uuid references widgets(id)`
- `occurred_at timestamptz`
- `domain text`
- `path text`
- `referrer text`
- `user_agent_hash text`
- `ip_hash text`
- `country text`

Indexes:

- Index `(widget_id, occurred_at desc)`.
- Index `(domain, occurred_at desc)`.

### widget_clicks

Fields:

- `id uuid pk`
- `widget_id uuid references widgets(id)`
- `feed_item_id uuid nullable references feed_items(id)`
- `occurred_at timestamptz`
- `target_url text`
- `domain text`
- `referrer text`
- `user_agent_hash text`
- `ip_hash text`

Indexes:

- Index `(widget_id, occurred_at desc)`.
- Index `(feed_item_id)`.

### integrations

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `provider text check in ('slack','discord','telegram','email','zapier','make')`
- `name text`
- `status text`
- `credentials_encrypted text`
- `metadata jsonb default '{}'`
- `created_by_user_id uuid references users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Index `(workspace_id, provider, status)`.

### webhooks

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `name text`
- `target_url text not null`
- `secret_encrypted text`
- `scope text check in ('workspace','feed','bundle')`
- `feed_id uuid nullable references feeds(id)`
- `bundle_id uuid nullable references bundles(id)`
- `events text[]`
- `is_enabled boolean default true`
- `failure_count integer default 0`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Index `(workspace_id, is_enabled)`.
- Index `(feed_id)`.
- Index `(bundle_id)`.

### webhook_deliveries

Fields:

- `id uuid pk`
- `webhook_id uuid references webhooks(id)`
- `event_id text not null`
- `status text check in ('queued','delivered','failed','abandoned')`
- `attempt integer default 0`
- `request_headers jsonb`
- `request_body jsonb`
- `response_status integer`
- `response_body text`
- `next_retry_at timestamptz`
- `created_at timestamptz`
- `delivered_at timestamptz`

Indexes:

- Unique `(webhook_id, event_id, attempt)`.
- Index `(webhook_id, created_at desc)`.
- Index `(status, next_retry_at)`.

### alerts

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `integration_id uuid references integrations(id)`
- `source_type text check in ('feed','bundle','collection')`
- `source_id uuid not null`
- `destination jsonb not null`
- `format_config jsonb default '{}'`
- `is_enabled boolean default true`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Index `(workspace_id, is_enabled)`.
- Index `(integration_id)`.

### email_digests

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `source_type text`
- `source_id uuid`
- `recipients citext[]`
- `frequency text check in ('immediate','daily','weekly')`
- `send_time_local time`
- `timezone text`
- `last_sent_at timestamptz`
- `is_enabled boolean default true`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- Index `(workspace_id, is_enabled)`.
- Index `(frequency, send_time_local)`.

### api_keys

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `name text`
- `prefix text not null`
- `key_hash text not null`
- `scopes text[]`
- `last_used_at timestamptz`
- `expires_at timestamptz`
- `created_by_user_id uuid references users(id)`
- `created_at timestamptz`
- `revoked_at timestamptz`

Indexes:

- Unique `prefix`.
- Index `(workspace_id, revoked_at)`.

### usage_limits

Fields:

- `id uuid pk`
- `workspace_id uuid references workspaces(id)`
- `period_start timestamptz`
- `period_end timestamptz`
- `metric text`
- `used integer default 0`
- `limit integer nullable`
- `metadata jsonb default '{}'`
- `updated_at timestamptz`

Indexes:

- Unique `(workspace_id, period_start, period_end, metric)`.

### audit_logs

Fields:

- `id uuid pk`
- `workspace_id uuid nullable references workspaces(id)`
- `actor_user_id uuid nullable references users(id)`
- `action text not null`
- `target_type text`
- `target_id uuid`
- `ip_hash text`
- `user_agent_hash text`
- `metadata jsonb default '{}'`
- `created_at timestamptz`

Indexes:

- Index `(workspace_id, created_at desc)`.
- Index `(target_type, target_id)`.
- Index `(actor_user_id, created_at desc)`.

### error_logs

Fields:

- `id uuid pk`
- `workspace_id uuid nullable references workspaces(id)`
- `feed_id uuid nullable references feeds(id)`
- `job_id uuid nullable references feed_refresh_jobs(id)`
- `severity text check in ('info','warning','error','critical')`
- `source text`
- `code text`
- `message text`
- `details jsonb default '{}'`
- `created_at timestamptz`

Indexes:

- Index `(feed_id, created_at desc)`.
- Index `(severity, created_at desc)`.
- Index `(code, created_at desc)`.

## 7. API Design

Principles:

- REST is sufficient for v1 because resources are clear and external developers expect feed/webhook APIs. GraphQL is unnecessary initially and adds auth, caching, and N+1 complexity. Consider GraphQL only for internal admin dashboards if REST becomes cumbersome.
- All authenticated API routes require workspace context via session or `Authorization: Bearer <api_key>`.
- Public endpoints can be public, unlisted, or tokenized private URLs.
- Standard errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`.
- Standard pagination: `limit`, `cursor` preferred for new APIs; support `offset` only where useful for admin exports.
- Rate-limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

### Auth and Users

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/signup` | Public | `email`, `password`, `name` | user, workspace | `EMAIL_TAKEN`, `WEAK_PASSWORD` | IP + email |
| POST | `/auth/login` | Public | `email`, `password` | session, user | `INVALID_CREDENTIALS`, `EMAIL_UNVERIFIED` | strict IP |
| POST | `/auth/logout` | Session | none | `ok` | `UNAUTHORIZED` | user |
| GET | `/me` | Session/API | none | user, workspaces | `UNAUTHORIZED` | user |
| PATCH | `/me` | Session | profile fields | user | `VALIDATION_ERROR` | user |

### Workspaces

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/workspaces` | Session | none | list | `UNAUTHORIZED` | user |
| POST | `/workspaces` | Session | name | workspace | `LIMIT_EXCEEDED` | user |
| PATCH | `/workspaces/{id}` | admin | name, settings | workspace | `FORBIDDEN` | workspace |
| GET | `/workspaces/{id}/members` | member | none | members | `FORBIDDEN` | workspace |
| POST | `/workspaces/{id}/invites` | admin | email, role | invite | `LIMIT_EXCEEDED` | workspace |
| PATCH | `/workspaces/{id}/members/{memberId}` | owner/admin | role | member | `LAST_OWNER` | workspace |
| DELETE | `/workspaces/{id}/members/{memberId}` | owner/admin | none | deleted | `LAST_OWNER` | workspace |

### Feed Creation and Discovery

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/feeds/discover` | member | `url`, options | discovery result, preview | `UNSAFE_URL`, `NO_FEED_FOUND`, `FETCH_FAILED` | workspace + host |
| POST | `/feeds` | editor | source config, settings | feed | `LIMIT_EXCEEDED`, `VALIDATION_ERROR` | workspace |
| GET | `/feeds` | member | filters, cursor | feeds | `FORBIDDEN` | workspace |
| GET | `/feeds/{id}` | member | none | feed detail | `NOT_FOUND` | workspace |
| PATCH | `/feeds/{id}` | editor | settings/status | feed | `INVALID_INTERVAL` | workspace |
| DELETE | `/feeds/{id}` | editor | none | deleted | `NOT_FOUND` | workspace |
| POST | `/feeds/{id}/refresh` | editor | force boolean | job | `REFRESH_THROTTLED`, `LIMIT_EXCEEDED` | workspace + feed |
| GET | `/feeds/{id}/items` | member | cursor, filters | items | `NOT_FOUND` | workspace |
| GET | `/feeds/{id}/jobs` | member | cursor | jobs | `NOT_FOUND` | workspace |

### Public Outputs

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/f/{slug}.xml` | public/token | none | RSS XML | `NOT_FOUND`, `PRIVATE_FEED` | IP + feed |
| GET | `/f/{slug}.json` | public/token | none | JSON feed | `NOT_FOUND`, `PRIVATE_FEED` | IP + feed |
| GET | `/f/{slug}.csv` | public/token | none | CSV | `NOT_FOUND`, `PRIVATE_FEED` | IP + feed |

### Filters

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/feeds/{id}/filters` | member | none | filters | `NOT_FOUND` | workspace |
| POST | `/feeds/{id}/filters` | editor | rule | filter | `LIMIT_EXCEEDED`, `VALIDATION_ERROR` | workspace |
| PATCH | `/filters/{id}` | editor | rule changes | filter | `NOT_FOUND` | workspace |
| DELETE | `/filters/{id}` | editor | none | deleted | `NOT_FOUND` | workspace |
| POST | `/filters/test` | editor | source id, rules | included/excluded preview | `VALIDATION_ERROR` | workspace |

### Bundles

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/bundles` | editor | name, feed ids | bundle | `LIMIT_EXCEEDED` | workspace |
| GET | `/bundles` | member | cursor | bundles | `FORBIDDEN` | workspace |
| GET | `/bundles/{id}` | member | none | bundle + preview | `NOT_FOUND` | workspace |
| PATCH | `/bundles/{id}` | editor | settings | bundle | `VALIDATION_ERROR` | workspace |
| PUT | `/bundles/{id}/feeds/{feedId}` | editor | order | bundle | `NOT_FOUND` | workspace |
| DELETE | `/bundles/{id}/feeds/{feedId}` | editor | none | bundle | `NOT_FOUND` | workspace |
| DELETE | `/bundles/{id}` | editor | none | deleted | `NOT_FOUND` | workspace |

### Collections

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/collections` | editor | name | collection | `LIMIT_EXCEEDED` | workspace |
| GET | `/collections/{id}` | member | none | collection | `NOT_FOUND` | workspace |
| POST | `/collections/{id}/items` | editor | feed item id or snapshot | collection item | `DUPLICATE_ITEM` | workspace |
| PATCH | `/collections/{id}/items/{itemId}` | editor | status, order, note | item | `FORBIDDEN` | workspace |
| DELETE | `/collections/{id}/items/{itemId}` | editor | none | deleted | `NOT_FOUND` | workspace |

### Widgets

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/widgets` | editor | source, type, config | widget | `LIMIT_EXCEEDED` | workspace |
| GET | `/widgets` | member | cursor | widgets | `FORBIDDEN` | workspace |
| GET | `/widgets/{id}` | member | none | widget | `NOT_FOUND` | workspace |
| PATCH | `/widgets/{id}` | editor | config/status | widget | `CUSTOM_CSS_NOT_ALLOWED` | workspace |
| GET | `/embed/widget/{publicId}.js` | public | none | JS | `NOT_FOUND`, `DOMAIN_BLOCKED` | IP + widget |
| GET | `/embed/widget/{publicId}` | public | none | iframe/html | `NOT_FOUND` | IP + widget |
| POST | `/events/widget-view` | public | event payload | accepted | `RATE_LIMITED` | IP + widget |
| POST | `/events/widget-click` | public | event payload | accepted | `RATE_LIMITED` | IP + widget |

### Integrations, Alerts, Digests

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/integrations/slack/connect` | admin | OAuth code | integration | `OAUTH_FAILED` | workspace |
| POST | `/integrations/discord` | admin | webhook URL | integration | `VALIDATION_ERROR` | workspace |
| POST | `/integrations/telegram` | admin | bot/channel config | integration | `VALIDATION_ERROR` | workspace |
| GET | `/integrations` | member | none | integrations | `FORBIDDEN` | workspace |
| DELETE | `/integrations/{id}` | admin | none | deleted | `NOT_FOUND` | workspace |
| POST | `/alerts` | editor | integration, source, config | alert | `LIMIT_EXCEEDED` | workspace |
| POST | `/alerts/{id}/test` | editor | none | delivery result | `DELIVERY_FAILED` | workspace |
| POST | `/email-digests` | editor | source, recipients, schedule | digest | `LIMIT_EXCEEDED` | workspace |

### API Keys and Webhooks

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api-keys` | admin | name, scopes, expiry | key once, metadata | `LIMIT_EXCEEDED` | workspace |
| GET | `/api-keys` | admin | none | key metadata list | `FORBIDDEN` | workspace |
| DELETE | `/api-keys/{id}` | admin | none | revoked | `NOT_FOUND` | workspace |
| POST | `/webhooks` | editor/API | target URL, events, scope | webhook | `UNSAFE_URL`, `LIMIT_EXCEEDED` | workspace |
| GET | `/webhooks` | member/API | none | webhooks | `FORBIDDEN` | workspace |
| PATCH | `/webhooks/{id}` | editor/API | changes | webhook | `VALIDATION_ERROR` | workspace |
| POST | `/webhooks/{id}/test` | editor/API | optional payload | delivery | `DELIVERY_FAILED` | workspace |
| GET | `/webhooks/{id}/deliveries` | member/API | cursor | deliveries | `NOT_FOUND` | workspace |

### Billing and Usage

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/plans` | public | none | plans | none | IP |
| GET | `/usage` | member | none | usage metrics | `FORBIDDEN` | workspace |
| POST | `/billing/checkout` | owner/billing | plan code | checkout URL | `INVALID_PLAN` | workspace |
| POST | `/billing/portal` | owner/billing | none | portal URL | `NO_CUSTOMER` | workspace |
| POST | `/billing/webhook` | Stripe | raw event | accepted | `INVALID_SIGNATURE` | Stripe |

### Admin

| Method | Path | Auth | Request | Response | Errors | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/admin/users` | admin | search | users | `FORBIDDEN` | admin |
| GET | `/admin/workspaces` | admin | search | workspaces | `FORBIDDEN` | admin |
| GET | `/admin/feeds/{id}/diagnostics` | admin | none | diagnostics | `NOT_FOUND` | admin |
| POST | `/admin/jobs/{id}/replay` | admin | reason | job | `INVALID_STATE` | admin |
| POST | `/admin/impersonations` | admin | user/workspace/reason | session | `REASON_REQUIRED` | admin |

## 8. Feed Generation Engine

### Pipeline

1. Accept input:
   - URL, native feed URL, visual recipe, platform source, newsletter address, or search query.
2. Normalize and validate:
   - Parse URL with a standards-compliant parser.
   - Resolve redirects with max redirect count.
   - Block private IPs, loopback, link-local, metadata endpoints, internal hostnames, unusual schemes, and DNS rebinding.
   - Enforce HTTP/HTTPS only.
3. Robots and policy:
   - Fetch and cache `robots.txt` by host where applicable.
   - Respect disallow rules for crawler behavior. RFC 9309 notes robots rules are not authorization, but they are a crucial product trust and blocklist policy.
   - Apply terms/adapter restrictions for platform sources.
4. Discover:
   - Check `<link rel="alternate" type="application/rss+xml|atom+xml|json">`.
   - Try common feed paths.
   - Parse sitemap URLs for likely recent content pages.
   - Detect page metadata and repeated item patterns.
5. Fetch:
   - Static HTTP fetch first with user-agent, timeout, content length limit, compression handling.
   - Conditional GET for native feeds using ETag and Last-Modified.
   - Browser render only when configured or required.
6. Extract:
   - Native parser for RSS/Atom/RDF/JSON Feed.
   - HTML auto-extractor for repeated cards/articles.
   - Visual selector recipe if present.
   - Platform adapter parser if source is classified.
7. Normalize:
   - Title, link, canonical URL, description text/html, image, author, date published, date modified, raw fields.
   - Clean HTML and strip scripts.
   - Resolve relative URLs.
8. Fingerprint:
   - Prefer canonical URL + source.
   - Fall back to source GUID.
   - Fall back to normalized title + date + source hash.
   - Store content hash for changed item detection.
9. Deduplicate:
   - Exact fingerprint dedup.
   - Similarity dedup using normalized title and canonical URL.
   - Bundle-level cross-feed dedup.
10. Date extraction:
   - Native dates first.
   - JSON-LD/OpenGraph/article metadata second.
   - DOM selector dates third.
   - Relative dates parsed in source timezone when known.
   - If missing, use `first_seen_at` and flag low confidence.
11. Image extraction:
   - Native enclosure/media fields first.
   - OpenGraph/Twitter image second.
   - DOM image selector third.
   - Validate type/size through proxy before widget use.
12. Filters:
   - Workspace global filters.
   - Feed filters.
   - Bundle filters if building bundle output.
   - Missing-field filters.
13. Store:
   - Upsert items by feed and fingerprint.
   - Mark changed items when content hash changes.
   - Preserve raw snapshot references for diagnostics.
14. Render:
   - Invalidate feed/bundle/widget caches.
   - Generate or lazily serve RSS/JSON/CSV.
15. Deliver:
   - Create events for webhooks, alerts, digests, widget cache refresh.
16. Observe:
   - Record job metrics, source latency, items found/new/changed, error class, next refresh.

### Refresh Scheduling

- Free plan: 24-hour refresh minimum.
- Starter: 120-minute refresh minimum.
- Developer and Pro: 15-minute minimum for normal feeds.
- Enterprise: custom intervals after cost and abuse review.
- Manual refresh uses a separate quota to prevent queue abuse.
- Failed jobs use exponential backoff and stop after repeated failures until next scheduled window or user action.

### Broken Feed Detection

Mark feed as:

- `degraded`: fetch succeeds but fewer fields/items than expected.
- `failed`: repeated fetch/extraction failure.
- `paused`: user or billing stopped jobs.
- `active`: recent successful refresh.

Notify user when:

- A feed fails N consecutive times.
- A visual selector recipe drops below minimum item match count.
- A source returns login/captcha/block page.
- Webhook or alert delivery is repeatedly failing.

### Handling Blocked Websites

- Do not bypass paywalls, logins, captchas, or anti-bot protections.
- Offer user alternatives: native feed discovery, official API integration, visual builder, lower refresh rate, or manual source exclusion.
- Maintain per-host request limits and blocklist.

### Legal and Robots Considerations

- Respect robots.txt and source terms as product policy.
- Store only metadata/snippets needed for feed outputs unless the user has rights to more.
- Keep source attribution and canonical links.
- Do not remove copyright notices from original content.
- Provide abuse report flow and takedown process.

## 9. Visual RSS Builder

### UX Flow

1. User selects "Visual Builder" and enters URL.
2. Backend validates URL and starts a builder session.
3. Browser worker loads page in isolated environment.
4. Frontend shows preview screenshot/interactive DOM proxy.
5. User selects repeated item container or clicks a representative post.
6. User maps fields: title, link, image, description, date, author.
7. System proposes selectors and highlights all matching items.
8. User reviews extracted preview.
9. User tests selectors.
10. User saves recipe as a feed source.
11. Refresh workers re-run recipe on schedule.
12. If selector match count or field quality changes, feed becomes degraded and user is notified.

### Technical Design

- Use Playwright worker pool.
- Never let arbitrary target pages run inside the main app origin.
- Prefer screenshot plus DOM metadata overlay for selection, or sandboxed iframe on a separate builder origin.
- Record selector candidates:
  - CSS selector.
  - XPath fallback only if needed.
  - Text/attribute hints.
  - Parent container selector.
  - Minimum/maximum item count expectations.
- Test selectors on current DOM before save.
- Store recipe as versioned JSON:
  - `containerSelector`
  - `fieldSelectors`
  - `renderJs`
  - `waitForSelector`
  - `scrollStrategy`
  - `dateParsingHints`
  - `qualityThresholds`

### Security Concerns

- SSRF controls before browser navigation.
- Isolated browser network egress.
- Block internal IP resolution after redirects and DNS changes.
- Disable downloads.
- Block file, ftp, chrome, and extension schemes.
- Time and memory limits per session.
- Sanitize all extracted HTML.
- Do not proxy authenticated user cookies to target sites.

### Acceptance Criteria

- Builder can generate a feed from a static article listing page.
- Builder can generate a feed from a JS-rendered listing when `renderJs` is enabled.
- User can see exactly which fields will be extracted before saving.
- Broken selector detection produces a clear degraded state.

## 10. Widget System

### Widget Builder UI

Screens:

- Select source: feed, bundle, collection.
- Select layout: feed, list, news wall, carousel, ticker, image board, magazine.
- Configure display: item count, title, date, author, image, description, source badge.
- Style: font family, text color, background, accent, spacing, border, radius, columns.
- Advanced: custom CSS, UTM tags, affiliate tags, allowed domains.
- Preview: desktop, tablet, mobile.
- Publish: copy script embed and iframe fallback.
- Analytics: views, clicks, CTR, top domains, top items.

### Public Widget Endpoint

- `GET /embed/widget/{publicId}.js` returns small async loader.
- Loader creates shadow DOM or iframe depending on config and host capabilities.
- Loader fetches widget payload from CDN-backed endpoint.
- Payload contains sanitized item data and style config.

### Iframe vs Script

Script approach:

- Pros: Better responsive integration and styling.
- Cons: CSP issues, host CSS collision unless shadow DOM.

Iframe approach:

- Pros: Strong isolation and safer custom CSS.
- Cons: Height resizing complexity and less native page integration.

Recommendation:

- Default to script + shadow DOM.
- Provide iframe fallback for strict sites and custom CSS-heavy widgets.

### Caching

- CDN cache widget JS long-term by version.
- Widget payload short TTL, stale-while-revalidate.
- Invalidate on feed/bundle/collection update and widget config change.

### Styling Isolation

- Shadow DOM for script widgets.
- CSS variables for theme config.
- Custom CSS only inside iframe or constrained shadow root.

### Analytics

- Count view when widget payload is rendered.
- Count click through redirect endpoint or event beacon.
- Hash IP/user agent; avoid invasive tracking.
- Aggregate daily metrics.

### Abuse Protection

- Allowed domain enforcement.
- Per-widget rate limits.
- Referrer validation where possible.
- Public widget traffic anomaly detection.
- Kill switch for abusive widgets.

### Performance Targets

- Loader JS under 15 KB gzipped for v1.
- Widget first content under 800 ms p95 from CDN on cached payload.
- Feed output endpoint under 300 ms p95 cached.
- No synchronous blocking on host page render.

## 11. Integrations

### Slack

Implementation:

- OAuth install for workspace.
- Store bot token encrypted.
- Channel picker after install.
- Send blocks with title, description, source, image, date, and link.
- Respect Slack rate limits and retry headers.

Acceptance:

- User can connect Slack, select channel, preview, and send test.

### Discord

Implementation:

- Start with Discord webhook URL support.
- Later add OAuth bot for channel selection.
- Format embeds with title, URL, description, thumbnail.

Acceptance:

- User can paste Discord webhook URL and receive item posts.

### Telegram

Implementation:

- Bot token and chat/channel ID flow.
- Validate bot has channel permissions.
- Send Markdown/HTML-safe messages.

Acceptance:

- User can connect bot and receive formatted item messages.

### Email Digests

Implementation:

- Digest schedules per recipient group.
- Timezone-aware delivery.
- Bounce and unsubscribe handling.
- Include source links and manage frequency.

Acceptance:

- User receives daily digest with items since last digest.

### Webhooks

Implementation:

- Workspace, feed, and bundle scopes.
- Event types: `feed.item.created`, `feed.item.updated`, `feed.refresh.failed`, `bundle.item.created`.
- HMAC SHA-256 signature with timestamp and raw body.
- Delivery logs, retries, test event.

Acceptance:

- Receiver can verify signature and ignore duplicate event IDs.

### Zapier/Make Compatibility

Implementation:

- Provide RSS and JSON endpoints that Zapier/Make can poll.
- Provide webhooks compatible with catch-hook steps.
- Later create official Zapier app with triggers: new feed item, feed failed, new bundle item.

Acceptance:

- User can connect Srotiva feed URL to RSS by Zapier or IFTTT.

### API Keys

Implementation:

- Scoped keys: read feeds, write feeds, manage webhooks, read usage.
- Show secret once.
- Store hash only.
- Rotation and revocation.

Acceptance:

- Revoked keys fail immediately.

### OPML/CSV Import-Export

Implementation:

- OPML import creates native feed records.
- CSV export can be direct link or queued download.
- OPML export includes current workspace feeds and bundles where representable.

Acceptance:

- Import reports created/skipped/failed rows.

## 12. Billing and Plans

This plan system is inspired by RSS.app limits but adapted for a new SaaS. Public plan packaging should remain flexible until infrastructure costs are measured.

| Limit | Free | Starter | Developer | Pro | Enterprise |
| --- | --- | --- | --- | --- | --- |
| Price | $0 | $12/mo | $29/mo | $99/mo | Custom |
| Trial | none | 14 days | 14 days | 14 days | custom |
| Feeds | 2 native/generated | 25 | 100 | 500 | custom |
| Refresh interval | 24h | 120 min | 15 min | 15 min | custom |
| Posts per feed | 5 | 25 | 50 | 100 | custom |
| Widgets | 1 branded | 5 | 25 | 100 | custom |
| Widget custom CSS | no | no | yes | yes | yes |
| Widget analytics | basic | basic | full | full | custom |
| Webhooks | 0 | 2 | 10 | 50 | custom |
| Alerts per platform | 0 | 5 | 25 | 100 | custom |
| Email digests | 1 | 5 | 25 | 100 | custom |
| Team members | 1 | 1 | 3 | 10 | custom |
| API operations/month | 0 | 1,000 | 25,000 | 250,000 | custom |
| API rate limit | none | 1/s | 5/s | 20/s | custom |
| Keyword filters | basic 5 | 25 | 100 | 500 | custom |
| Advanced filter rules | no | yes | yes | yes | yes |
| Bundles | no | 5 | 25 | 100 | custom |
| Collections | 1, 10 items | 5, 50 items | 25, 250 items | 100, 1000 items | custom |
| Newsletter feeds | no | 2 | 20 | 100 | custom |
| Visual builder | no | limited | yes | yes | custom |
| Social adapters | no | selected | selected | more + priority | custom/legal review |
| Branding | Srotiva link | removable | removable | removable | custom |
| Support | docs | email | priority email | priority + diagnostics | SLA |

Trial logic:

- Starter/Developer/Pro trials require payment method.
- Trial creates entitlements immediately.
- Trial ending without payment success downgrades to Free grace mode.
- Trial abuse checks: domain, payment fingerprint, email/domain, IP risk.

Upgrade behavior:

- Immediate entitlement increase.
- Refresh intervals can be recalculated immediately.
- Existing jobs keep their current run state.

Downgrade behavior:

- Do not delete feeds/widgets.
- Mark resources above limit as inactive in a user-controlled order, defaulting to oldest inactive/least recently used.
- Keep data read-only for 30 days before archival policy.

Over-limit handling:

- Soft warnings at 80 percent.
- Hard block for creating new resources beyond plan.
- For usage metrics, throttle API and manual refresh.
- For public widgets, continue serving cached content during billing grace period, then show branded inactive state.

Usage tracking:

- Metrics: feed count, scheduled refreshes, manual refreshes, browser-render minutes, API operations, webhook deliveries, alert deliveries, widget views, CSV exports, storage.
- Roll up hourly and monthly.

## 13. Security, Compliance, and Abuse Prevention

### Authentication Security

- Strong password hashing.
- Email verification.
- MFA for paid teams.
- Secure HTTP-only cookies.
- Session revocation.
- Audit logs for security events.

### API Key Security

- Display key once.
- Store hash only.
- Prefix for lookup.
- Scopes and expiration.
- Rotation and immediate revocation.

### Webhook Signing

- Header: `Srotiva-Signature: t=<unix>,v1=<hmac>`.
- HMAC SHA-256 over `${timestamp}.${raw_body}`.
- Reject timestamps outside 300 seconds.
- Use timing-safe comparison.

### SSRF Protection

- Parse URLs using standard library, not regex.
- Allow only HTTP/HTTPS.
- Resolve DNS and block private, loopback, link-local, multicast, reserved, metadata IPs.
- Re-check IP after redirects.
- Protect against DNS rebinding.
- Block custom ports unless allowlisted.
- Fetch from isolated network egress.

### URL Fetching Restrictions

- Max redirects.
- Max response size.
- Connect/read timeouts.
- Content type checks.
- Robots policy.
- Per-host rate limits.
- No user-provided headers except controlled allowlist.

### Rate Limiting

- Login by IP/email.
- API by key/workspace.
- Manual refresh by workspace/feed.
- Fetches by host and source type.
- Public endpoints by IP/feed/widget.
- Webhook delivery by destination.

### Bot Detection and Trial Abuse

- Signup risk scoring.
- CAPTCHA only when risk is high.
- Disposable email/domain controls.
- Payment fingerprint checks.
- Abuse reports and source/domain blocklists.

### Scraping Abuse Controls

- No paywall/login/captcha bypass.
- Do not support credentialed scraping in v1.
- Respect robots policy.
- Per-host crawl budget.
- User-agent identification with contact URL.

### Data Privacy

- Minimize personal data in analytics.
- Hash IP/user-agent for widget analytics.
- Encrypt integration credentials and webhook secrets.
- Clear retention policies for raw fetch snapshots and email bodies.

### Copyright and Content Concerns

- Store metadata/snippets by default.
- Link to original source.
- Do not present copied full text as owned content.
- Provide takedown workflow.
- Let users hide/remove items.

### Terms of Service Concerns

- Terms must prohibit illegal scraping, credential sharing, paywall bypass, spam, and surveillance abuse.
- Platform adapters require terms review before launch.

### Logging and Audit Trails

- Audit user/admin/security/billing changes.
- Log crawler errors without leaking secrets.
- Redact tokens, cookies, email bodies where unnecessary.

## 14. Admin Panel

Admin features:

- User management: search users, status, email verification, security events.
- Workspace management: plan, usage, members, status, abuse flags.
- Feed/job monitoring: refresh history, queue state, fetch status, parser output, item counts.
- Failed feed diagnostics: HTTP status, robots result, extraction result, selector match counts, screenshots where safe.
- Plan/subscription management: current Stripe status, invoices, entitlement overrides.
- Abuse reports: domains, users, workspaces, blocked hosts, public widget abuse.
- System usage dashboard: feed count, job throughput, browser minutes, widget views, webhook deliveries.
- Queue health: queue depth, lag, failure rate, worker heartbeat.
- Crawl error logs: grouped by host, code, adapter, workspace.
- Webhook delivery logs: status, attempt, response, next retry.
- Support impersonation with audit logs: reason required, time-limited, visible to admins, no secret access.

Acceptance criteria:

- Support can resolve common feed failures from UI.
- Admin actions are audited.
- Abuse blocks take effect in fetcher before network request.

## 15. Development Roadmap

### Stage 0: Research and Prototype

Goal: Prove feed parsing, URL safety, and basic generated feed extraction.

Features included: native RSS parsing, one webpage extractor prototype, output RSS/JSON sample, source research.

Features excluded: auth, billing, widgets, visual builder, social adapters.

Engineering tasks: build parser spike, fetcher safety spike, sample extractor, schema draft.

Database changes: none or local SQLite/Postgres prototype.

APIs: CLI or internal prototype endpoint.

Frontend screens: none or minimal local console.

Acceptance criteria: parser handles RSS/Atom samples; generated feed from 3 public pages; unsafe URLs blocked.

Risks: extraction quality, SSRF complexity.

Complexity: Medium.

Dependencies: none.

### Stage 1: MVP Feed Generator

Goal: Create and render feeds from URL/native RSS.

Features included: feed creation, discovery, parser, normalized items, RSS/JSON/CSV endpoints, basic dedup.

Features excluded: accounts beyond simple auth, scheduler, filters beyond dedup, widgets.

Engineering tasks: data model, feed API, fetcher, parser, renderer, item fingerprints.

Database changes: `users`, `workspaces`, `feeds`, `feed_sources`, `feed_items`, `feed_refresh_jobs`, `error_logs`.

APIs: `/feeds/discover`, `/feeds`, `/feeds/{id}`, output endpoints.

Frontend screens: URL input, preview, feed detail.

Acceptance criteria: user creates feed and can copy RSS/JSON/CSV URLs.

Risks: malformed feeds, source blocking.

Complexity: High.

Dependencies: auth choice, Postgres.

### Stage 2: User Dashboard and Saved Feeds

Goal: Make feed management usable.

Features included: account dashboard, saved feeds, feed list, detail page, output links, basic settings.

Features excluded: billing, teams, advanced filters, integrations.

Engineering tasks: auth flows, workspace defaults, feed list, settings, empty/error states.

Database changes: complete `users`, `workspaces`, `workspace_members`.

APIs: auth, workspace, feed list/update/delete.

Frontend screens: login/signup, dashboard, feed detail, settings.

Acceptance criteria: user can manage multiple saved feeds.

Risks: auth and tenant isolation errors.

Complexity: Medium.

Dependencies: Stage 1.

### Stage 3: Scheduler and Auto-Refresh

Goal: Keep feeds updated automatically.

Features included: scheduled refresh, manual refresh, retry, feed health, job logs.

Features excluded: paid refresh tiers, external alerts.

Engineering tasks: BullMQ/Redis, scheduler, worker, status transitions, stale-feed handling.

Database changes: expand `feed_refresh_jobs`, feed refresh fields.

APIs: manual refresh, jobs list.

Frontend screens: refresh status, job history, health banners.

Acceptance criteria: active feeds refresh on schedule and update outputs.

Risks: queue reliability, duplicate events.

Complexity: High.

Dependencies: Stage 1 schema.

### Stage 4: Filters and Feed Management

Goal: Give users content control.

Features included: whitelist/blacklist, advanced rules, missing-field filtering, duplicate/similar removal, pinned posts, customization.

Features excluded: bundles, widgets, alerts.

Engineering tasks: rule engine, filter preview, item status, feed settings, link enrichment.

Database changes: `feed_filters`, item filter metadata.

APIs: filters CRUD, filter test, feed settings.

Frontend screens: filter builder, item preview, settings.

Acceptance criteria: filters explain included/excluded items.

Risks: confusing rule semantics.

Complexity: High.

Dependencies: Stage 3 refresh pipeline.

### Stage 5: Widgets

Goal: Make feeds embeddable.

Features included: widget builder, list/feed/news wall/ticker MVP, embed script, iframe fallback, basic analytics.

Features excluded: all widget layouts, custom CSS for lower plans, advanced analytics.

Engineering tasks: widget schema, public embed service, shadow DOM renderer, CDN/cache, analytics events.

Database changes: `widgets`, `widget_configs`, `widget_views`, `widget_clicks`.

APIs: widgets CRUD, embed JS, event endpoints.

Frontend screens: widget builder, preview, embed modal, analytics summary.

Acceptance criteria: widget loads on external HTML page and tracks click.

Risks: CSP, styling isolation, performance.

Complexity: High.

Dependencies: stable feed outputs.

### Stage 6: Webhooks and Integrations

Goal: Deliver feed updates into systems and team channels.

Features included: webhooks, signed payloads, retries/logs, Slack, Discord webhook, Telegram, email digest.

Features excluded: official Zapier app, Make app, Teams.

Engineering tasks: event bus, delivery workers, credentials encryption, integration setup flows.

Database changes: `integrations`, `webhooks`, `webhook_deliveries`, `alerts`, `email_digests`.

APIs: webhooks CRUD/test, integrations, alerts, digests.

Frontend screens: integrations, webhook logs, alert setup.

Acceptance criteria: new item sends exactly one webhook/alert with retry logs.

Risks: duplicate delivery, revoked tokens, rate limits.

Complexity: High.

Dependencies: Stage 3 events.

### Stage 7: Billing and SaaS Limits

Goal: Turn product into a billable SaaS.

Features included: Stripe plans, checkout, portal, trial, usage tracking, plan enforcement, over-limit states.

Features excluded: enterprise contracts, custom invoicing.

Engineering tasks: plan model, entitlements, Stripe webhooks, usage rollups, UI meters.

Database changes: `plans`, `subscriptions`, `usage_limits`.

APIs: plans, billing checkout/portal/webhook, usage.

Frontend screens: pricing, billing, usage, upgrade prompts.

Acceptance criteria: plan limits block creation/refresh/API overages server-side.

Risks: billing state mismatch, accidental service cutoff.

Complexity: High.

Dependencies: Stage 2 workspaces and Stage 3 jobs.

### Stage 8: Visual RSS Builder

Goal: Support difficult pages without code.

Features included: page load, point-and-click selectors, field mapping, preview, recipe save, recipe refresh.

Features excluded: authenticated pages, advanced scripting, all social platforms.

Engineering tasks: Playwright pool, builder session API, selector generator, sandboxed preview, recipe runner.

Database changes: `feed_sources.recipe`, object storage for screenshots/snapshots.

APIs: builder sessions/select/test/save.

Frontend screens: visual builder wizard.

Acceptance criteria: non-technical user builds a feed from a non-RSS listing page.

Risks: security, site blocking, selector fragility.

Complexity: Very high.

Dependencies: Stage 1 feed model, Stage 3 workers.

### Stage 9: Social/Platform-Specific Sources

Goal: Add source adapters that are legally and technically viable.

Features included: YouTube, Reddit, Telegram, Bluesky first; Google News topics; adapter registry.

Features excluded: prohibited or fragile sources until reviewed, credentialed scraping.

Engineering tasks: adapter interface, per-platform parsers, quota handling, feature flags, legal review checklist.

Database changes: `feed_sources.adapter_key`, `integrations` where tokens required.

APIs: supported sources, adapter preview.

Frontend screens: source-specific feed creation.

Acceptance criteria: supported platform URLs create feeds with clear reliability labels.

Risks: terms, API quotas, platform changes.

Complexity: Very high.

Dependencies: Stage 3 workers, Stage 4 filters.

### Stage 10: Team Collaboration and Admin Panel

Goal: Support agencies, teams, and internal operations.

Features included: team invites, roles, admin dashboard, diagnostics, impersonation audit, queue health.

Features excluded: SSO/SAML unless enterprise demand exists.

Engineering tasks: RBAC hardening, admin UI, support tools, audit logs.

Database changes: expand `workspace_members`, `audit_logs`.

APIs: workspace members, admin routes.

Frontend screens: team settings, admin dashboard.

Acceptance criteria: admin can diagnose failed feed and team roles restrict actions.

Risks: privilege escalation, privacy issues.

Complexity: High.

Dependencies: Stage 7 billing and Stage 3 jobs.

### Stage 11: Scale, Monitoring, Reliability, Production Hardening

Goal: Prepare for production load and operational maturity.

Features included: observability, backups, load testing, incident playbooks, domain blocklists, status page, performance tuning.

Features excluded: new user-facing features.

Engineering tasks: metrics/traces/logs, alerting, queue autoscaling, backup restore tests, CDN tuning, security review.

Database changes: indexes, retention policies, partitions if needed.

APIs: no major public changes.

Frontend screens: status surfaces and admin metrics.

Acceptance criteria: defined SLOs, tested backup restore, load-tested public endpoints.

Risks: hidden crawler cost, noisy neighbors.

Complexity: High.

Dependencies: all production features.

## 16. MVP Scope

Strict MVP goal: Users can create reliable feeds from native RSS or simple public web pages, save them, auto-refresh them, apply basic filters, and copy RSS/JSON/CSV outputs.

Must-have:

- Auth with default workspace.
- Feed creation by URL.
- Native RSS/Atom parsing.
- Simple webpage extraction for common article listing pages.
- Feed preview before save.
- Saved feed dashboard.
- RSS, JSON, CSV output endpoints.
- Scheduled refresh at fixed interval.
- Manual refresh with throttle.
- Exact deduplication.
- Basic keyword whitelist/blacklist.
- Error states and refresh logs.
- URL safety and SSRF controls.
- Basic docs/help pages.

Should-have:

- OPML import/export.
- Basic bundle support.
- Basic email digest.
- Simple list widget.
- Stripe plan scaffolding with manual limits.
- Feed health notifications.

Later:

- Visual builder.
- Social/platform adapters beyond native public RSS.
- Newsletter-to-RSS.
- Webhooks.
- Slack/Discord/Telegram.
- Advanced filters and similar dedup.
- Full widget suite and analytics.
- Team collaboration.
- Admin panel beyond minimal diagnostics.
- API key management.
- Billing automation.
- Translation.

4-6 week MVP acceptance:

- A user can sign up, paste a URL, generate or discover a feed, save it, see items, and copy working RSS/JSON/CSV links.
- Feed refreshes automatically and avoids duplicate items.
- Unsafe URLs are blocked.
- Failed feeds show readable errors.
- The app can be deployed with database, queue, and worker.

## 17. Production Readiness Checklist

Performance:

- Output endpoints cached.
- Feed list paginated.
- Widget payload CDN-backed.
- Browser render jobs isolated and capped.
- Database indexes reviewed with query plans.

Security:

- SSRF protections tested.
- Auth/session security reviewed.
- API keys hashed.
- Integration secrets encrypted.
- Webhook signatures implemented.
- Admin RBAC tested.

Monitoring:

- API latency, error rate, job latency, queue depth.
- Feed success/failure rates.
- Host-level crawler failure rates.
- Webhook/alert delivery failure rates.
- Widget traffic anomalies.

Backups:

- Automated Postgres backups.
- Object storage retention policy.
- Restore drill completed.

Error tracking:

- Sentry or equivalent for frontend/backend/workers.
- Error codes mapped to user-facing messages.

Queue retries:

- Retry policy per job type.
- Dead-letter queues.
- Idempotency for item creation and deliveries.

Billing tests:

- Checkout success.
- Payment failure.
- Trial expiry.
- Upgrade/downgrade.
- Webhook replay.

Load testing:

- Public feed endpoints.
- Widget JS/payload endpoints.
- Scheduled refresh throughput.
- Webhook burst delivery.

API documentation:

- Auth, pagination, errors, rate limits.
- Feed endpoints.
- Webhooks and signature verification.
- Examples in curl and JavaScript.

Admin support tools:

- Feed diagnostics.
- Job replay.
- Webhook logs.
- User/workspace lookup.
- Impersonation audit.

Deployment:

- Separate web, worker, scheduler, browser worker processes.
- Environment variable validation.
- Migration workflow.
- Rollback plan.

CI/CD:

- Lint, typecheck, unit tests, integration tests, build.
- Migration check.
- Smoke tests after deploy.

Legal pages:

- Terms of Service.
- Privacy Policy.
- Acceptable Use Policy.
- Copyright/takedown process.
- Data retention policy.

## 18. Agentic Development Breakdown

### Task 1: Define Core Schema and Migrations

Context: Build the data foundation for users, workspaces, feeds, sources, items, jobs, filters, and logs.

Expected output: Database schema, migrations, seed plan rows, model types.

Files/modules likely involved: `db/schema`, migration folder, ORM client, type definitions.

Acceptance criteria: Migration runs cleanly; tenant indexes exist; tests verify required constraints.

Test cases: duplicate feed slug blocked per workspace; duplicate item fingerprint blocked per feed; required fields enforced.

Dependencies: Tech stack decision.

Suggested prompt: "Implement the initial Postgres schema for Srotiva using the product requirements. Include users, workspaces, workspace_members, feeds, feed_sources, feed_items, feed_refresh_jobs, feed_filters, plans, usage_limits, audit_logs, and error_logs. Add migrations and tests for key constraints."

### Task 2: Implement Auth and Workspace Shell

Context: Users need secure login and a default workspace.

Expected output: Signup/login/logout, default workspace, workspace switcher, RBAC middleware.

Files/modules likely involved: auth routes, layout, workspace context, middleware.

Acceptance criteria: New user can sign up and land in dashboard; unauthorized workspace access is blocked.

Test cases: invalid login, duplicate signup, member role checks, session expiry.

Dependencies: Task 1.

Suggested prompt: "Implement authentication and workspace tenancy for Srotiva. Create signup/login/logout, default workspace creation, workspace-aware middleware, and role checks for owner/admin/editor/viewer."

### Task 3: Build URL Safety and Fetcher Service

Context: Feed generation accepts user URLs, so SSRF protection is mandatory.

Expected output: URL validator, DNS/IP guard, redirect guard, HTTP fetcher, tests.

Files/modules likely involved: `src/lib/url-safety`, `src/lib/fetcher`, worker utilities.

Acceptance criteria: Private/internal URLs are blocked; public HTTP/HTTPS URLs fetch within limits.

Test cases: localhost, 127.0.0.1, 169.254.169.254, IPv6 loopback, DNS rebinding mock, redirects to private IP, oversized response.

Dependencies: none.

Suggested prompt: "Implement a secure URL validation and fetch module for feed creation. It must block SSRF vectors, enforce HTTP/HTTPS only, re-check redirects, cap response size/time, and include unit tests for internal IP and redirect bypass attempts."

### Task 4: Native Feed Parser and Renderer

Context: Native RSS/Atom support is the most reliable MVP source.

Expected output: Parser normalizes feed metadata/items; RSS/JSON/CSV renderers.

Files/modules likely involved: `src/lib/feed-parser`, `src/lib/feed-renderer`, tests.

Acceptance criteria: RSS and Atom samples parse; output endpoints render valid RSS/JSON/CSV.

Test cases: missing GUID, malformed date, duplicate items, HTML description, media enclosure.

Dependencies: Task 1, Task 3.

Suggested prompt: "Build the native RSS/Atom parser and output renderers. Normalize title, URL, descriptions, author, image, date, GUID/fingerprint, and raw fields. Add tests with RSS and Atom fixtures."

### Task 5: Feed Creation API and Preview UI

Context: User needs to paste a URL, preview output, and save a feed.

Expected output: `/feeds/discover`, `/feeds`, feed preview UI, feed detail.

Files/modules likely involved: API routes, feed service, React components.

Acceptance criteria: Pasting a native feed URL shows preview and saves feed.

Test cases: invalid URL, unsafe URL, native feed, no feed found, duplicate feed URL.

Dependencies: Tasks 1, 3, 4.

Suggested prompt: "Implement the feed discovery and creation flow. Add API endpoints for preview and save, and a dashboard UI where a user can paste a URL, inspect preview items, save the feed, and copy output URLs."

### Task 6: Webpage Extraction MVP

Context: Generated feeds from ordinary web pages are core to the product.

Expected output: Static HTML extractor for common article/card lists.

Files/modules likely involved: extractor module, tests, discovery service.

Acceptance criteria: Extractor works on at least three public fixture pages and returns multiple items with title/link.

Test cases: relative links, missing image, no repeated items, duplicate cards, article date metadata.

Dependencies: Task 3.

Suggested prompt: "Implement a static HTML webpage extractor for MVP feed generation. It should detect repeated article/card links, normalize URLs, extract title/description/image/date when available, and return confidence scores plus tests."

### Task 7: Scheduler and Refresh Workers

Context: Feeds must refresh automatically and reliably.

Expected output: Scheduler, queue, worker, job status, retries, manual refresh.

Files/modules likely involved: worker process, queue config, API route, dashboard status.

Acceptance criteria: Active feeds refresh on schedule; manual refresh enqueues a job; duplicate items are not recreated.

Test cases: successful refresh, failed fetch, retry, duplicate item, changed item, manual refresh throttle.

Dependencies: Tasks 1, 4, 5, 6.

Suggested prompt: "Add the scheduled refresh system using Redis/BullMQ. Implement feed_refresh_jobs, worker processing, retry/backoff, manual refresh throttling, item upserts, and dashboard job status."

### Task 8: Basic Filters

Context: Users need immediate content control.

Expected output: Whitelist/blacklist filters and missing-field filters with preview.

Files/modules likely involved: filter engine, API routes, UI builder, tests.

Acceptance criteria: Filters apply on refresh and can be previewed before saving.

Test cases: blacklist title, whitelist description, missing image, conflicting rules, case insensitive match.

Dependencies: Task 7.

Suggested prompt: "Implement the basic filter engine for feeds with whitelist keywords, blacklist keywords, and missing-field rules. Add rule CRUD APIs, preview endpoint, frontend rule editor, and tests explaining why items are filtered."

### Task 9: Output Endpoints and OPML/CSV

Context: Users need reliable outputs and import/export.

Expected output: Public/private RSS/JSON/CSV endpoints, OPML import/export, CSV safety.

Files/modules likely involved: public routes, renderers, import service, export service.

Acceptance criteria: Output URLs work and OPML import creates feeds.

Test cases: private token, CSV injection, OPML duplicates, cache headers.

Dependencies: Tasks 4, 5.

Suggested prompt: "Complete feed output endpoints and import/export. Implement stable RSS XML, JSON, CSV, private token access, cache headers, OPML import/export, and CSV injection safeguards."

### Task 10: Widget MVP

Context: Widgets are a major value surface after feeds work.

Expected output: List widget builder, embed JS, iframe fallback, basic view/click tracking.

Files/modules likely involved: widgets schema/API, embed route, renderer, analytics events.

Acceptance criteria: Widget renders on an external static HTML test page.

Test cases: allowed domain, mobile width, empty feed, click tracking, CSP fallback.

Dependencies: Tasks 5, 9.

Suggested prompt: "Build the MVP embeddable widget system with one list layout. Add widget CRUD, config storage, public JS embed, iframe fallback, responsive rendering, and basic view/click analytics."

### Task 11: Webhooks and Notifications

Context: Users need push delivery into systems and team channels.

Expected output: Webhook CRUD, signed payloads, delivery worker/logs, Discord webhook MVP, email digest MVP.

Files/modules likely involved: event service, webhook worker, integration service, logs UI.

Acceptance criteria: New item emits signed webhook and retry logs.

Test cases: signature verification, timeout retry, duplicate event ID, disabled webhook after failures.

Dependencies: Task 7.

Suggested prompt: "Implement webhooks for feed item events. Include scoped subscriptions, HMAC signatures, delivery retries, logs, test event, and an initial Discord webhook destination plus daily email digest."

### Task 12: Billing and Limits

Context: SaaS needs plan enforcement and paid tiers.

Expected output: Stripe plans, checkout, portal, webhooks, usage meters, entitlement checks.

Files/modules likely involved: billing service, usage service, plan config, frontend billing pages.

Acceptance criteria: Plan limits block over-limit feed/widget/webhook creation.

Test cases: checkout success, payment failure, trial expired, downgrade below usage, Stripe webhook replay.

Dependencies: Tasks 1, 2, 7.

Suggested prompt: "Implement Stripe billing and plan limits for Srotiva. Add public plans, checkout, customer portal, Stripe webhook handling, usage rollups, entitlement checks, UI usage meters, and tests for upgrade/downgrade states."

### Task 13: Visual Builder

Context: Advanced feed generation requires non-code selector recipes.

Expected output: Builder session API, Playwright worker, selector overlay UI, recipe save/run.

Files/modules likely involved: browser worker, builder API, builder UI, recipe extractor.

Acceptance criteria: User can create a feed from a no-RSS listing page using point-and-click selectors.

Test cases: selector match count, JS-rendered page, broken selector, unsafe URL, timeout.

Dependencies: Tasks 3, 6, 7.

Suggested prompt: "Build the Visual RSS Builder. Use isolated Playwright sessions, provide a safe page preview and element selection overlay, generate/test selectors, save extraction recipes, and run recipes in refresh workers."

### Task 14: Admin Diagnostics

Context: Operations need support and reliability tools.

Expected output: Admin dashboard for users/workspaces/feeds/jobs/errors/webhooks with audit.

Files/modules likely involved: admin routes, admin UI, audit service.

Acceptance criteria: Admin can inspect failed feed diagnostics and replay a job with reason.

Test cases: admin RBAC, impersonation audit, job replay, error log grouping.

Dependencies: Tasks 1, 7, 11.

Suggested prompt: "Implement the admin diagnostics dashboard for Srotiva. Include user/workspace lookup, feed diagnostics, job history, error logs, webhook deliveries, queue health summary, audited impersonation, and job replay."

## 19. Final Deliverables

Complete feature list:

- Account registration and login.
- Workspace/team management.
- Feed creation from URL.
- Native RSS/Atom/RDF/JSON Feed support.
- Webpage feed generation.
- Visual RSS builder.
- Platform-specific sources.
- Google News/topic/keyword feeds.
- Newsletter-to-RSS.
- Feed dashboard, preview, refresh, scheduling, manual refresh.
- Parser, extraction, deduplication, filtering.
- Keyword whitelist/blacklist, advanced filter rules, similar removal, missing-field filtering.
- Pinned posts, customization, optional translation, image proxy.
- Bundles and collections/manual curation.
- RSS, JSON, CSV, OPML import/export.
- Webhooks and API keys.
- Slack, Telegram, Discord, email digests.
- Embeddable widgets: feed, list, news wall, carousel, ticker, image board, magazine.
- Widget customization, embed script, analytics, UTM, affiliate tags.
- Billing, subscriptions, usage limits.
- Admin dashboard, abuse prevention, monitoring, support.

Prioritized roadmap:

1. Research/prototype.
2. MVP feed generator.
3. Dashboard and saved feeds.
4. Scheduler and refresh.
5. Filters and feed management.
6. Widgets.
7. Webhooks and integrations.
8. Billing and SaaS limits.
9. Visual builder.
10. Social/platform sources.
11. Team/admin.
12. Scale and production hardening.

Architecture diagram:

- See Section 4 for the text architecture diagram.

Database schema:

- See Section 6.

API list:

- See Section 7.

MVP plan:

- See Section 16.

Production plan:

- See Sections 12, 13, 14, and 17.

Open questions before development:

1. Which customer segment is first: marketers/agencies, developers, or researchers?
2. Should Srotiva use a managed auth provider or own Auth.js from the start?
3. Which deployment target is preferred for browser workers: Fly.io, Render, ECS, or Kubernetes?
4. Are social adapters required for launch, or can launch focus on native feeds, webpages, newsletters, and Google News?
5. What legal stance should we take on robots.txt disallow: hard block, warning, or enterprise-configurable policy?
6. Should public feed/widget URLs use the purchased Srotiva domain or customer custom domains?
7. What content retention policy is acceptable for feed items, raw snapshots, screenshots, and newsletter email bodies?
8. Do we need SOC 2 readiness in year one?
9. What is the desired free-plan generosity given crawler and browser-rendering costs?
10. Should visual builder be Stage 8 as planned, or is it required in MVP for differentiation?
