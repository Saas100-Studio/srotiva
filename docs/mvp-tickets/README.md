# Srotiva MVP Sprint Ticket Pack

Use this folder as the implementation queue for the MVP only. Each ticket is in its own Markdown file so an AI coding agent can take one file, implement it, run its tests, and stop for review.

Source PRD: `docs/rss-saas-product-requirements.md`

Progress tracker: `docs/mvp-tickets/PROGRESS.md`

## MVP Boundary

Build now:

- Auth with default workspace.
- Feed creation by URL.
- Native RSS/Atom parsing.
- Simple public webpage extraction.
- Feed preview before save.
- Saved feed dashboard.
- RSS, JSON, and CSV output endpoints.
- Scheduled refresh at a fixed interval.
- Manual refresh with throttling.
- Exact deduplication.
- Basic keyword whitelist/blacklist filtering.
- Error states and refresh logs.
- URL safety and SSRF controls.
- Basic docs/help pages.
- Production readiness for the MVP surface.

Do not build yet:

- Visual RSS builder.
- Social/platform adapters beyond generic website/native feed discovery.
- Newsletter-to-RSS.
- Widgets.
- Webhooks.
- Slack, Discord, Telegram, and email digests.
- Advanced similar-post deduplication.
- Billing automation.
- Team collaboration beyond default single-user workspace ownership.
- Admin panel beyond internal logs needed for MVP support.
- Translation.

## Sprint Sequence

### Sprint 00: Foundation

1. `sprint-00-foundation/S00-T01-runtime-config-and-errors.md`
2. `sprint-00-foundation/S00-T01b-typescript-and-lint-setup.md`
3. `sprint-00-foundation/S00-T02-database-schema-and-client.md`
4. `sprint-00-foundation/S00-T03-auth-and-default-workspace.md`
5. `sprint-00-foundation/S00-T04-authorization-and-audit-logs.md`

### Sprint 01: Feed Engine Core

1. `sprint-01-feed-engine/S01-T01-url-safety.md`
2. `sprint-01-feed-engine/S01-T02-http-fetcher-and-robots.md`
3. `sprint-01-feed-engine/S01-T03-native-feed-parser-and-fingerprints.md`
4. `sprint-01-feed-engine/S01-T04-feed-renderers.md`

### Sprint 02: Discovery and Creation APIs

1. `sprint-02-discovery-creation/S02-T01-native-feed-discovery.md`
2. `sprint-02-discovery-creation/S02-T02-static-html-extractor.md`
3. `sprint-02-discovery-creation/S02-T03-feed-discover-preview-api.md`
4. `sprint-02-discovery-creation/S02-T04-feed-save-and-items-api.md`
5. `sprint-02-discovery-creation/S02-T05-public-output-endpoints.md`

### Sprint 03: User Dashboard

1. `sprint-03-dashboard/S03-T01-dashboard-shell.md`
2. `sprint-03-dashboard/S03-T02-feed-creation-ui.md`
3. `sprint-03-dashboard/S03-T03-feed-detail-ui.md`
4. `sprint-03-dashboard/S03-T04-help-empty-and-error-states.md`

### Sprint 04: Refresh Jobs

1. `sprint-04-refresh-jobs/S04-T01-refresh-queue-and-worker-shell.md`
2. `sprint-04-refresh-jobs/S04-T02-refresh-worker-pipeline.md`
3. `sprint-04-refresh-jobs/S04-T03-manual-refresh-api-and-throttle.md`
4. `sprint-04-refresh-jobs/S04-T04-scheduler-and-feed-health.md`

### Sprint 05: Filters and Production Hardening

1. `sprint-05-filters-hardening/S05-T01-basic-filter-engine.md`
2. `sprint-05-filters-hardening/S05-T02-filter-api.md`
3. `sprint-05-filters-hardening/S05-T03-filter-ui.md`
4. `sprint-05-filters-hardening/S05-T04-rate-limits-and-observability.md`
5. `sprint-05-filters-hardening/S05-T05-production-readiness-gate.md`

## Execution Rules for AI Coding Agents

- Work on one ticket file at a time.
- Start with the lowest-numbered unfinished ticket.
- Read and update `docs/mvp-tickets/PROGRESS.md`.
- Read the PRD section referenced by the ticket before editing code.
- Keep changes scoped to the files listed in the ticket unless a test exposes a required supporting change.
- Run the exact tests required by the ticket, then run `bun run check`, which must pass lint, type check, test, and build.
- Do not implement out-of-scope advanced features while completing MVP tickets.

Convention note: from `S00-T01b` onward the codebase is strict TypeScript. Source and test modules use `.ts`, React components use `.tsx`, and root config files stay `.mjs`. Tickets authored before `S00-T01b` may still list `.mjs`/`.jsx` files; implement them as `.ts`/`.tsx`.
- After each ticket, summarize changed files, commands run, test results, and any blocked acceptance criteria.
