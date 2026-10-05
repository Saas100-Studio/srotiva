# Post-MVP Production Readiness Backlog

Each item below should be implemented as a small, reviewable change. Update
`PROGRESS.md` with commands, results, environment evidence, and remaining risk.

## P0 launch blockers

### PR-001 Dependency and supply-chain remediation

Current evidence: `bun audit` reported 37 findings on 2026-10-04, including
three critical findings affecting the installed Next.js 16.2.10 graph.

Acceptance criteria:

- Replace floating `latest` production dependencies with reviewed versions.
- Upgrade Next.js and affected transitive dependencies to patched releases.
- Regenerate and commit `bun.lock` using the declared Bun version.
- `bun audit` has no unresolved exploitable critical/high production findings;
  document any development-only exception with exposure analysis.
- Lint, strict typecheck, tests, and production build pass.
- CI uses a frozen lockfile and fails on agreed severity thresholds.

### PR-002 Production topology and deployment contract

Acceptance criteria:

- Select and document the production host, region, canonical origin, database,
  secret manager, reverse proxy/CDN, and log/metric providers.
- Define supervised web, scheduler, and refresh-worker components.
- Define scheduler frequency and worker concurrency from a capacity estimate.
- Run `prisma migrate deploy` exactly once per release before new code serves.
- Provide staging and production configuration inventories without secrets.
- Document deploy, rollback, maintenance, and post-deploy smoke procedures.

### PR-003 Database continuity and retention

Acceptance criteria:

- Use a least-privilege application role and appropriate connection pooler.
- Enable encrypted automated backups and point-in-time recovery where available.
- Define backup retention, RPO, RTO, and restoration ownership.
- Complete and record a restoration drill.
- Define retention/purge rules for soft-deleted feeds, items, raw diagnostics,
  audit logs, error logs, and refresh jobs.
- Test migrations from the previous production schema on a restored copy.

### PR-004 Runtime security baseline

Acceptance criteria:

- Emit CSP, HSTS in production, nosniff, frame protection, referrer policy, and
  a minimal permissions policy; disable the framework signature header.
- Enforce request-size limits at the proxy and bound JSON bodies in the app.
- Validate same-origin mutations or implement CSRF tokens for cookie-auth APIs.
- Trust forwarded client IP headers only from the selected proxy/platform.
- Redact credentials and `token` query values from proxy, app, and APM logs.
- Separate session signing from private-output-token derivation and provide a
  versioned rotation procedure.
- Add automated header and cross-origin mutation tests.

### PR-005 Refresh worker and queue recovery

Acceptance criteria:

- Running jobs have a lease/heartbeat or bounded stale threshold.
- A crashed worker's job can be reclaimed safely.
- Completion and failure transitions are idempotent or protected against
  redelivery ambiguity.
- Duplicate open jobs are prevented with a database-enforced invariant.
- Queue depth, oldest queued job, oldest running job, and success/failure rates
  are observable and alertable.
- Crash-point and concurrent-worker integration tests pass.

### PR-006 Observability, SLOs, and incident response

Acceptance criteria:

- Ship structured logs from web, scheduler, and worker to durable storage.
- Add browser/server/worker error tracking with token and PII redaction.
- Record latency, status, refresh outcome, queue lag, and database metrics.
- Define availability and refresh-freshness SLOs with alert thresholds.
- Readiness and liveness are separate; worker/scheduler freshness is monitored.
- Publish an incident runbook, escalation path, and status communication plan.
- Identify releases with a commit/build identifier instead of only `1.0.0`.

### PR-007 Legal and trust launch gate

Acceptance criteria:

- Qualified review replaces every draft legal placeholder.
- Publish operator identity, governing jurisdiction, eligibility/age terms,
  service limitations, suspension, termination, and warranty terms.
- Privacy notice covers data categories, purposes, retention, subprocessors,
  international transfers, security, and applicable user rights.
- Publish monitored support, privacy, abuse, security, and takedown contacts.
- Document crawler identity, user agent, robots policy, source attribution, and
  prohibited paywall/authentication bypass behavior.
- Add cookie disclosure and consent only for non-essential technologies used.

## P1 public beta requirements

### PR-008 Accounts and user lifecycle

- Verify email ownership before unrestricted crawling.
- Implement forgot/reset password, change password, profile/email settings,
  session revocation, and logout-all-sessions.
- Implement account deletion and personal-data export with retention exceptions.
- Decide and document MFA scope and compromised-password controls.
- Avoid account-enumeration and reset-token leakage.

### PR-009 Shared abuse and cost controls

- Replace process-local rate limits with shared durable enforcement before
  multiple app instances.
- Apply edge limits to signup, login, discovery, outputs, and unknown slugs.
- Enforce per-workspace feed, refresh, item, storage, and request quotas.
- Add per-origin crawl concurrency/delay rules and operational domain blocklists.
- Add suspicious-signup defenses and abuse review tooling.

### PR-010 Product workflow completion

- Remove or implement the `/dashboard/settings` navigation destination.
- Add a complete paginated/searchable feed list; do not fetch all feeds only to
  render the first five.
- Add private output-token rotation/revocation.
- Add custom not-found, route error, and global error experiences.
- Add a monitored in-product support/contact path.
- Define restore/permanent-delete behavior for soft-deleted feeds.

### PR-011 Delivery, staging, and end-to-end coverage

- Add CI with the declared Bun version and frozen lockfile.
- Use an isolated ephemeral PostgreSQL database for tests.
- Add browser E2E for authentication, feed creation, saved-feed management,
  filters, refresh, visibility, output access, and deletion.
- Add migration, secret scanning, dependency scanning, accessibility, and
  post-deploy smoke jobs.
- Maintain a production-like staging environment and rehearse rollback.

### PR-012 Technical SEO

- Add `/robots.txt` and `/sitemap.xml` with deliberate public/private coverage.
- Set `metadataBase`, canonical URLs, route titles/descriptions, Open Graph and
  social-card metadata, icons, and a social preview image.
- Mark dashboard, authentication, private/tokenized, and other non-search pages
  `noindex` through metadata or `X-Robots-Tag` as appropriate.
- Add relevant, accurate structured data without unsupported claims.
- Enforce one canonical HTTPS host and validate redirects.
- Register the production property with search engines and submit the sitemap.

### PR-013 Accessibility and browser quality

- Add automated axe checks for core screens.
- Verify keyboard operation, focus management, screen-reader announcements,
  contrast, reduced motion, high contrast, and 200%/400% zoom.
- Test supported mobile and desktop browsers.
- Replace confirmation interactions where native dialogs prevent a coherent
  accessible recovery flow.

## P2 production maturity

### PR-014 Public content and discoverability

- Publish accurate feature, use-case, documentation, FAQ, security/crawler,
  about/contact, and pricing/free-beta policy pages.
- Avoid thin programmatic landing pages and unsupported feature claims.
- Validate canonical tags, structured data, social previews, broken links, and
  Search Console coverage on the deployed domain.

### PR-015 Performance and scale

- Add load tests and budgets for web latency, public output, discovery, and
  refresh throughput.
- Paginate all unbounded queries and model database/storage growth.
- Use conditional upstream fetches with ETag/Last-Modified and safe 304 support.
- Define CDN/cache behavior, connection-pool sizing, queue capacity, and scaling
  triggers from measurements.
- Collect production Core Web Vitals and server latency percentiles.

### PR-016 Feed compatibility and data hygiene

- Sanitize stored/external HTML at every HTML rendering boundary.
- Enforce image media types, support permalink RSS GUID fallback, and expand
  Atom/XHTML compatibility when justified by real fixtures.
- Add semantic validation with common RSS readers and validators.
- Preserve filtered/hidden/deleted state through retention and reprocessing.

### PR-017 Brand, sharing, help, and contact readiness

- Complete the browser, Apple touch, PWA, and optional pinned-tab icon matrix.
- Replace the square-logo share card with a dedicated 1200x630 image and
  `summary_large_image` metadata.
- Validate homepage and help-page previews on deployed social and messaging
  clients, including WhatsApp and X.
- Expand help into task-oriented articles covering all shipped MVP behavior.
- Publish a monitored contact page with distinct support, privacy, security,
  abuse, and takedown paths.
- Publish crawler transparency and RFC 9116 security contact information once
  real owner-approved contacts exist.
- Follow the detailed contract in `brand-sharing-and-support.md`.
