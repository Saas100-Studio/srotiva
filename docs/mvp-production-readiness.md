# Morsel MVP Production Readiness

This document is the release gate for the current MVP, not a claim that an
environment is production-ready by virtue of passing repository tests.

## Implemented and automated

- Strict environment validation: `bun run validate-env`.
- Database migrations and tenant-integrity constraints through Prisma.
- Authenticated single-workspace feed creation, discovery, outputs, refresh,
  health, exact deduplication, and keyword filters.
- URL protocol, port, DNS, redirect, metadata-address, private-address, and
  robots-policy checks before crawler fetches.
- Database-backed refresh queue with one-shot scheduler and worker commands.
- Process-local abuse limits and structured request/error identifiers.
- Readiness check at `GET /api/health`, with coalesced, bounded database work and
  a two-second response bound. External scheduler/worker health is not checked.
- Database-backed happy-path smoke coverage without live network access.
- Draft legal placeholders linked from dashboard Help and Legal navigation.

## Deployment checklist

In CI or pre-release, with `DATABASE_URL` pointing only to an isolated, migrated
test database:

- [ ] Run `bun run validate-env`, `bun run check`, and `bunx prisma validate`.
- [ ] Never run `bun run check` against the production database; test fixtures
      create and delete records.

For production deployment:

- [ ] Use a dedicated production database and a least-privilege application role.
- [ ] Store secrets in the hosting secret manager; do not copy `.env.local`.
- [ ] Set `APP_URL` to the canonical HTTPS origin and use a new random `SESSION_SECRET` of at least 32 characters.
- [ ] Set an identifiable `CRAWLER_USER_AGENT` with a monitored contact URL.
- [ ] Run `bun run validate-env` and `bunx prisma validate`.
- [ ] Run `bunx prisma migrate deploy` once before starting the release.
- [ ] Start the web process and verify `/api/health` returns 200 without secrets.
- [ ] Schedule `bun run scheduler` at the chosen interval.
- [ ] Invoke `bun run worker:refresh` on a paced schedule with delay/backoff;
      each invocation processes at most one job. Do not use an immediate restart loop.
- [ ] After deployment, run `/api/health` and non-mutating output checks only.
- [ ] Confirm logs are retained and alert on repeated 5xx, refresh failures, scheduler failures, worker failures, and health-check failures.
- [ ] Confirm database backups, retention, encryption, and a restore drill.
- [ ] Configure TLS, security headers, request-size limits, and trusted client-IP forwarding at the reverse proxy.

## External release blockers

The code is feature-complete for an internal MVP beta, but public production
release remains blocked until the deployment owner completes these controls:

- A PostgreSQL backup policy and successful restore test.
- A selected hosting target with supervised web, scheduler, and worker processes.
- A trusted reverse-proxy/client-IP configuration. Forwarded IP headers are not trustworthy when the app is exposed directly.
- Durable centralized logs, retention, alerts, and an incident contact/runbook.
- Qualified legal review and real contact details for Terms, Privacy, Acceptable Use, and takedown pages.
- Production credentials, DNS/TLS, monitoring, and a post-deploy smoke run.

## Scale boundary

MVP rate limits are process-local and refresh jobs are PostgreSQL-backed. That
is acceptable for one web instance and low beta volume. Before multiple web
instances, move rate-limit buckets to shared storage such as Redis. Before
meaningful queue load, add worker leases/stale-job recovery and measure whether
the database queue remains sufficient. Browser automation, billing, widgets,
webhooks, social adapters, newsletters, and team collaboration remain out of
scope.

## Rollback

Keep the previous application artifact available. For an application-only
failure, stop new workers/schedulers, restore the previous artifact, and verify
`/api/health` plus public output. Database migrations in the MVP are forward
only; do not improvise a destructive rollback. Restore from a tested backup or
ship a corrective migration after assessing stored data.
