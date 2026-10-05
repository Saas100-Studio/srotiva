# Srotiva TODO

Non-critical improvements found during ticket review. Keep MVP tickets authoritative for implementation order.

Post-MVP launch gates and production-hardening work are tracked in
`docs/post-mvp-production-readiness/`. This file retains lower-level engineering
follow-ups and should not be used as the public-launch checklist.

- Native feeds: accept only image media types for `imageUrl` instead of any Atom enclosure or Media RSS content.
- Native feeds: use RSS GUIDs marked as permalinks when an item link is absent.
- Native feeds: support namespace-prefixed Atom roots and XHTML text constructs when real feeds require them.
- Output/UI: sanitize `descriptionHtml` at the rendering boundary before it is ever inserted into HTML.
- Feed renderers: strip lone UTF-16 surrogates and other non-XML scalar values if renderers begin accepting text from outside the validated parser path.
- Feed renderers: add semantic RSS validation against an external reader or validator when interoperability testing is introduced.
- Feed discovery: replace the small alternate-link attribute scanner with an HTML parser if malformed real-world markup or broader entity decoding causes missed feeds.
- Feed discovery: avoid fetching an ordinary submitted webpage twice when native link discovery needs the already-fetched HTML.
- Feed discovery: thread injected network collaborators through nested native discovery if tests need the real nested path without network access.
- HTML extractor: add JSON-LD/OpenGraph article dates and lazy-loaded/srcset images when real fixture failures justify broader heuristics.
- HTML extractor: broaden repeated-card detection beyond `article` and heading-based cards when production pages demonstrate a missed stable pattern.
- Public outputs: add explicit private-token rotation when users need to revoke a shared output URL.
- Dashboard: add workspace switching only after an active-workspace selection API and session behavior are defined.
- Dashboard: add the settings destination before public launch; the shell link is reserved but no settings workflow is in the current MVP ticket pack.
- Dashboard: keep account identity visible in the compact mobile shell when the final navigation pattern is designed.
- Feed creation UI: add browser-level discovery and save-flow coverage when the project adopts an end-to-end test harness.
- Feed creation UI: move focus to loading, error, and preview regions if usability testing shows keyboard users miss state changes.
- Feed detail UI: add browser-level coverage for clipboard, pause/resume, and confirmed deletion when the project adopts an end-to-end test harness.
- Public outputs: before supporting `SESSION_SECRET` rotation, resynchronize private-token hashes on authenticated detail access or introduce a dedicated stable output-token secret.
- Refresh queue: reclaim stale running jobs after a worker lease timeout once long-running workers are deployed.
- Refresh queue: add concurrent-claim and future-`nextRetryAt` integration tests if queue contention or retry scheduling becomes production-critical.
- Refresh queue: make terminal transitions retry-idempotent if production processing can redeliver completion or failure writes; worker ownership is now enforced by the real worker.
- Refresh pipeline: send conditional `If-None-Match`/`If-Modified-Since` requests and handle `304` once the shared fetcher accepts safe caller headers.
- Refresh pipeline: persist `robotsStatus=disallowed` on robots denials and suppress noisy error logs for stale jobs that encounter an already paused or deleted feed.
- Manual refresh: add a live cooldown countdown and browser-level click coverage if static retry feedback proves unclear in usability testing.
- Refresh scheduler: add a database-enforced partial uniqueness guard for open jobs if future enqueue paths bypass the feed-row locking used by the scheduler and manual refresh service.
- Feed health: tune the three-failure threshold and stale messaging from production refresh telemetry rather than adding configuration before real usage exists.
- Feed health: define a distinct draft health state if a user-facing draft workflow is introduced; current MVP feeds are activated on save.
- Refresh scheduler: backfill `next_refresh_at` before beta only if the pre-S04 pre-alpha database is promoted instead of starting with a clean production database.
- Filters: extend filtered-output regression coverage across RSS and CSV in addition to JSON if their shared active-item query is split in the future.
- Filters: add explicit refresh regressions for preserved hidden/deleted states and malformed legacy filter JSON when historical-data migration becomes relevant.
- Filters: add workspace-global rules and whole-history re-filtering only when those post-MVP workflows are introduced; MVP evaluates feed rules on items observed during refresh.
- Filter API: make feed existence checks and filter mutations one transaction if concurrent feed deletion becomes a supported workflow requiring snapshot-consistent errors.
- Filter API: authenticate before parsing mutation bodies if unauthenticated callers must always receive authorization errors instead of body-validation errors.
- Filter API: explicitly reject or map future `FeedFilterType` values in API projections before advanced rule types are exposed through the per-feed endpoints.
- Filter UI: add browser-level create, preview, toggle, delete, and viewer-role coverage when the project adopts an end-to-end test harness.
- Rate limits: replace process-local fixed-window buckets with a shared Redis-backed limiter before running multiple web instances.
- Rate limits: configure the production proxy as the only trusted source of forwarded client IP headers, or use the hosting platform's verified client-IP API for direct deployments.
- Observability: ship structured JSON logs to a durable sink with retention and alerting when the deployment platform is selected.
- Support diagnostics: add a global support-admin identity only if operations must diagnose workspaces without an explicit `SUPPORT` membership.
- Rate limits: add explicit signup and manual-refresh saturation route tests if those limits diverge from the shared limiter behavior.
- Support diagnostics: add cross-workspace support and empty job/error-history coverage if the diagnostics response grows beyond its current tenant-scoped query.
- Observability: add an end-to-end assertion correlating one request ID across response, structured log, and database error log when log capture is standardized.
- Production: replace process-local rate limits with Redis or equivalent before running multiple web instances.
- Production: add worker leases/stale-job recovery before running continuously at meaningful queue volume.
- Production: add durable log shipping, alerting, database backup/restore drills, and incident runbooks after choosing a hosting provider.
- Production: replace legal placeholders with counsel-reviewed Terms, Privacy, Acceptable Use, and takedown contacts before public launch.
- Production readiness: add built-server post-deploy smoke coverage after selecting a hosting target; current database smoke calls route handlers directly.
- Environment validation: add subprocess exit-code coverage if the CLI output or invocation contract grows beyond the tested validation function.
- Public outputs: prevent arbitrary nonexistent slugs from consuming distinct in-memory limiter buckets before public exposure without an upstream edge limiter.
