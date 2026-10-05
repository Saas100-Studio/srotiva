# Srotiva Post-MVP Production Readiness

This directory is the source of truth for work required after MVP completion
and before a broad public production launch. The MVP ticket pack remains
historical and should not be reopened for this work.

## Current release decision

Srotiva is suitable for a controlled internal beta after its database and
background processes are available. It is not approved for an unrestricted
public launch until every P0 gate below is complete and verified in the actual
production environment.

## Priority definitions

- **P0 - launch blocker:** unacceptable security, data-loss, legal, or core
  availability risk. All P0 items must be complete before public launch.
- **P1 - public beta requirement:** a material reliability, abuse, account, or
  operability gap. Complete before inviting unknown users at meaningful scale.
- **P2 - production maturity:** improves discoverability, accessibility,
  performance, maintainability, or support quality after the launch gates are
  safe.

## Workstreams

Detailed acceptance criteria and verification commands live in
[`BACKLOG.md`](./BACKLOG.md). Progress and environment-only gates live in
[`PROGRESS.md`](./PROGRESS.md). Browser icons, link previews, and the public
support-content contract live in
[`brand-sharing-and-support.md`](./brand-sharing-and-support.md). India-first
global legal and operational launch research lives in
[`global-legal-launch-research.md`](./global-legal-launch-research.md).

| Workstream | Priority | Scope |
| --- | --- | --- |
| Dependency and supply-chain security | P0 | Patch audited vulnerabilities, pin reviewed versions, enforce locked installs and scanning. |
| Hosting and process topology | P0 | Run web, scheduler, worker, migrations, and PostgreSQL as explicit supervised production components. |
| Database continuity | P0 | Backups, restore drill, pooling, migration procedure, RPO/RTO, and data-retention policy. |
| Runtime security | P0/P1 | Security headers, proxy trust, request bounds, origin/CSRF controls, shared limits, and secret rotation. |
| Worker and queue reliability | P0/P1 | Stale-job recovery, heartbeats, idempotency, retry policy, queue alerts, and capacity testing. |
| Observability and incident response | P0 | Central logs, error tracking, metrics, alerts, SLOs, runbooks, and release identifiers. |
| Legal and trust | P0 | Reviewed legal documents, real contacts, privacy disclosures, takedown process, and crawler identity. |
| Accounts and user lifecycle | P1 | Verification, password reset/change, settings, sessions, data export, and account deletion. |
| Abuse and cost controls | P1 | Feed/storage/refresh quotas, signup defenses, per-origin politeness, blocklists, and edge limits. |
| Product completeness | P1 | Remove dead navigation, expose all feeds with pagination, token rotation, support flow, and recovery UX. |
| SEO and public discovery | P1/P2 | Crawl directives, sitemap, canonical/social metadata, structured data, public content, and search-console validation. |
| Accessibility and browser quality | P1/P2 | Automated accessibility checks, keyboard/screen-reader validation, responsive and cross-browser E2E coverage. |
| Performance and scale | P2 | Load tests, performance budgets, conditional fetching, cache/CDN strategy, DB growth and capacity models. |
| Delivery and release engineering | P1 | CI, isolated test DB, staging, migration tests, dependency automation, deploy smoke tests, and rollback rehearsal. |

## Release gates

Public launch requires evidence for all of the following:

- [ ] Production dependency audit has no unresolved exploitable critical or
      high-severity findings.
- [ ] Web, scheduler, and worker processes are deployed and supervised.
- [ ] Readiness is healthy and worker/scheduler freshness is monitored.
- [ ] Production migrations are automated or run through a documented,
      repeatable release step.
- [ ] Encrypted backups exist and a restore drill has succeeded.
- [ ] Central logs, error tracking, metrics, and actionable alerts are live.
- [ ] Security headers, trusted-proxy handling, request limits, and mutation
      origin protection have been verified over the public HTTPS domain.
- [ ] Legal documents and monitored privacy, abuse, security, support, and
      takedown contacts are published.
- [ ] Stale refresh jobs can be recovered without duplicate item creation.
- [ ] Email verification, password recovery, account deletion, and data export
      have an explicit launch decision and working implementation where legally
      or operationally required.
- [ ] Abuse quotas prevent unbounded crawling, storage, and account creation.
- [ ] CI passes lint, strict types, tests, production build, Prisma validation,
      migration checks, and security scanning against an isolated database.
- [ ] Post-deploy smoke tests pass on the real production origin.
- [ ] A rollback exercise and incident-response walkthrough have succeeded.

## Implemented strengths to preserve

- Tenant-scoped authorization and composite database constraints.
- SSRF validation before fetch, DNS pinning, redirect revalidation, unsafe-port
  blocking, and robots-policy enforcement.
- Bounded crawler response sizes and timeouts.
- Exact feed-item deduplication and active-item-only public outputs.
- Private-output token hashing and constant-time token comparison.
- Strict TypeScript, deterministic fixtures, Prisma migrations, structured API
  errors, and a database-backed MVP smoke path.

Production hardening must not weaken these controls or expand into the advanced
product features that remain outside the current product strategy.
