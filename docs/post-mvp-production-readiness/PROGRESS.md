# Post-MVP Production Readiness Progress

Last updated: 2026-10-05

## Status

| ID | Priority | Status | Evidence / blocker |
| --- | --- | --- | --- |
| PR-001 | P0 | Done with documented dev-tool exceptions | Runtime advisories removed; 12 residual findings are confined to ESLint and Prisma CLI chains and explicitly allowlisted for production audit CI. |
| PR-002 | P0 | Blocked on hosting decision | No production target or process supervisor is recorded. |
| PR-003 | P0 | Blocked on provider controls | Backup, restore, pooling, retention, RPO, and RTO evidence required. |
| PR-004 | P0 | In progress | Security headers, canonical-host enforcement, bounded streaming JSON, framework-header removal, authenticated mutation origin protection, private-token rotation, and tests are implemented; trusted proxy enforcement and infrastructure log redaction remain environment-specific. |
| PR-005 | P0 | In progress | Stale-running-job reclamation and a one-open-job database migration are implemented; migrated-DB concurrency/crash verification and telemetry remain. |
| PR-006 | P0 | Blocked on provider selection | Local structured errors exist; durable telemetry and alerts do not. |
| PR-007 | P0 | Researched; blocked on owner/counsel input | India-first worldwide launch research and staged free-beta/paid-launch gates are documented; current legal pages still require the real operator and qualified review. |
| PR-008 | P1 | In progress | Settings, password change, data export, and guarded sole-owner deletion are implemented. Email verification/reset and global stateless-session revocation require further design/provider work. |
| PR-009 | P1 | In progress | Atomic feed/item/manual-refresh quotas are implemented. Shared distributed rate limits, edge enforcement, per-origin crawl pacing, and operational blocklists remain. |
| PR-010 | P1 | In progress | Dead navigation removed; bounded feed search/pagination, custom recovery UX, settings/data lifecycle, and one-time private-token rotation are implemented. Monitored support contact and soft-delete restore policy remain. |
| PR-011 | P1 | In progress | GitHub CI provides frozen Bun installs, isolated PostgreSQL, migrations, Prisma validation, production audit, full checks, and isolated Playwright E2E. Staging, migration-upgrade tests, and deploy smoke remain. |
| PR-012 | P1 | Implemented; deployment validation pending | robots, sitemap, manifest, canonical/social metadata, structured data, canonical-host redirects, and noindex policy implemented; production search-console validation remains. |
| PR-013 | P1 | In progress | Playwright and axe cover landing/auth/dashboard WCAG A/AA flows in isolated CI. Manual keyboard, screen-reader, zoom, high-contrast, mobile, and cross-browser validation remain. |
| PR-014 | P2 | Not started | Public marketing and trust content is minimal. |
| PR-015 | P2 | Not started | No load test, scale model, or production performance telemetry. |
| PR-016 | P2 | Not started | Compatibility and sanitization follow-ups remain in `docs/TODO.md`. |
| PR-017 | P1/P2 | In progress | Srotiva naming, generated large-card social metadata, rabbit-mark browser branding, expanded help, crawler guidance, and temporary email contact are implemented. Final domain/social validation and high-resolution Apple/PWA assets require owner inputs. |

## Audit evidence from 2026-10-04

- `bun run lint`: passed.
- `bun run typecheck`: passed.
- `bun run build`: passed with 22 generated application routes/pages.
- `bun audit`: failed with 37 findings: 3 critical, 24 high, 10 moderate.
- Local `GET /api/health`: 503 with database unavailable; refresh processes
  explicitly not checked.
- `/robots.txt`, `/sitemap.xml`, and `/manifest.webmanifest`: 404.
- Runtime responses lacked the intended production security-header baseline and
  exposed `X-Powered-By: Next.js`.
- The full database-backed suite was not rerun because the configured database
  was unavailable and its isolation could not be confirmed.

## Implementation record: 2026-10-04

- Updated and exactly pinned the dependency graph. Next.js moved from 16.2.10
  to 16.3.8; known deployed-runtime advisories were removed. The production
  audit command explicitly ignores only reviewed development-tool advisories so
  new findings still fail CI.
- Added production security headers, canonical-origin validation/redirects,
  technical SEO routes and metadata, search noindex boundaries, structured
  data, and automated coverage.
- Added same-origin enforcement for cookie-authenticated mutations in
  production, including signup, login, logout, and authenticated API context.
- Added stale refresh-job reclamation, worker pre-claim recovery, and a
  migration that cancels legacy duplicate open jobs before enforcing one queued
  or running job per feed.
- Removed dead Settings navigation, added bounded server-side feed search and
  pagination, capped the legacy list query, and added custom not-found and
  application/dashboard error experiences.
- Added GitHub CI with an isolated PostgreSQL service, migration deployment,
  Prisma validation, frozen dependencies, production audit, and full checks.
- Added editor-only private-feed token rotation with random one-time tokens,
  hash-only storage, immediate old-link invalidation, and no-store responses.
- Added real account settings with current-password verification, password
  change, tenant-scoped safe JSON export, and strongly confirmed sole-owner
  account/workspace deletion with audit coverage.
- Added a streaming 256 KiB JSON-body boundary and configurable atomic beta
  quotas: 25 feeds, 10,000 retained items, and 1,000 manual refreshes per UTC
  month by default.
- Added Playwright and axe browser coverage plus a disposable PostgreSQL CI job
  for signup, authenticated dashboard, logout, and WCAG A/AA scans.
- Combined verification after integration: lint passed without warnings, strict
  typecheck passed, all 202 tests passed, production build passed on Next.js
  16.3.8, Prisma schema validation passed, production audit passed, Playwright
  discovered all four E2E tests, and `git diff --check` passed. Three public/auth
  browser scans also passed locally with no axe violations; the authenticated
  flow is delegated to isolated CI because the shared local database has the new
  queue migration pending.
- `prisma migrate status` confirms
  `20261004090000_enforce_one_open_refresh_job` is pending on the configured
  shared Neon database. It was intentionally not applied from this audit turn;
  release deployment must run `prisma migrate deploy` first.
- Added the owner-approved rabbit brand mark to application headers and browser
  icons, restored “Small bites from the live web,” and added a compressed
  1200x630 Open Graph/X large-card image with complete image metadata. Expanded
  the public help centre to cover the shipped MVP and added an email-only
  contact page using a configurable temporary support address.
- Added India-first worldwide launch research covering staged entity, privacy,
  consumer, CERT-In, international privacy, and tax decisions. It is a
  counsel/CA decision checklist rather than legal approval.
- Post-integration verification: `bun run check` passed with 205 tests and a
  successful 37-page production build. Rendered HTML contained route-specific
  Open Graph metadata, a `summary_large_image` X card, image dimensions/type/alt,
  and both ICO and PNG favicon links; image responses returned the correct
  content types. Absolute metadata used the build-time `APP_URL`, as designed.

## Environment evidence still required

- Set the production `APP_URL` to the purchased Srotiva HTTPS domain and confirm
  the chosen apex or `www` host before deployment. Rotate existing sessions
  when deploying the renamed `srotiva_session` cookie.

- Hosting/provider selection and canonical HTTPS origin.
- Trusted proxy/client-IP contract and edge request limits.
- Production database/pooler, backup policy, and successful restore record.
- Scheduler cadence, worker concurrency, and queue capacity calculation.
- Log, metric, error-tracking, paging, and status-page providers.
- Real support, privacy, abuse, security, and takedown contacts.
- Qualified legal approval.
- Search-engine property ownership and analytics/privacy decision.

## Rebrand record: 2026-10-05

- Renamed Morsel to Srotiva in product copy, package identity, API error type,
  session cookie, crawler user agent, tests, fixtures, and current documentation.
- Kept the existing owner-approved rabbit mark and renamed its public asset.
  Replaced the old name-bearing share card with a generated Srotiva card; the
  original is archived at `assets/legacy/morsel-social-card.png`.
- No new configuration keys or production dependencies were added. Production
  `APP_URL`, crawler identity/contact URL, and support aliases still need
  verification against the purchased domain before launch.
- Verification: focused rebrand/SEO/security tests passed (41/41), `bun run
  lint`, `bun run typecheck`, and `bun run build` passed. `bun run check` reached
  the test phase but database-backed tests could not connect to the configured
  Neon PostgreSQL host; the build was run separately and passed.

## Update format

For every completed item, record:

- Files and infrastructure changed.
- Commands and automated checks run.
- Production/staging evidence collected.
- New configuration keys, without secret values.
- Remaining risk and rollback procedure.
