# Srotiva

Srotiva turns public websites and native RSS/Atom sources into refreshed RSS,
JSON, and CSV feeds. The current product is the single-workspace MVP described
in `docs/mvp-tickets/`.

## Local setup

Requirements: Bun 1.3.9 and PostgreSQL.

```bash
cp .env.example .env.local
bun install
bun run validate-env
bun run db:generate
bun run db:migrate
bun run db:seed
bun run dev
```

Replace every `.env.local` placeholder first. Never commit that file. Required
settings are `APP_URL`, `DATABASE_URL`, `SESSION_SECRET` (at least 32 random
characters), `CRAWLER_USER_AGENT`, `FETCH_TIMEOUT_MS`, `FETCH_MAX_BYTES`, and
`MANUAL_REFRESH_COOLDOWN_SECONDS`.

Optional production guardrails have safe beta defaults and can be tuned through
`REQUEST_JSON_MAX_BYTES`, `WORKSPACE_FEED_LIMIT`, `WORKSPACE_ITEM_LIMIT`, and
`WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT`; see `.env.example`. Changing them
should follow measured capacity and abuse data rather than marketing plan names.

## Runtime processes

The web app is long-running:

```bash
bun run build
bun run start
```

The scheduler and worker are intentionally one-shot database-backed commands.
Run the scheduler periodically. Each worker invocation processes at most one
job, so invoke it on a paced schedule with delay/backoff under a process
manager. Do not configure an unconditional immediate restart loop:

```bash
bun run scheduler
bun run worker:refresh
```

Production hosting must provide those schedules separately from the web
process. The readiness endpoint is `GET /api/health`; it returns 200 only while
the database is reachable. Scheduler and worker processes are external and are
reported as `not_checked`, not inferred healthy by this endpoint.

## Database deployment

Apply committed migrations before starting a new web release:

```bash
bunx prisma migrate deploy
```

Use `bun run db:migrate` only for local migration development. The seed is a
development fixture, not a production bootstrap command.

## Verify before release

Only run the full suite against an isolated, migrated test database. Never point
`bun run check` at production:

```bash
bun run validate-env
bun run check
bunx prisma validate
```

For production deployment, validate configuration and apply migrations without
running destructive test fixtures:

```bash
bun run validate-env
bunx prisma validate
bunx prisma migrate deploy
```

`bun run check` runs lint, strict type checks, database-backed tests, and a
production build. Tests create and delete records. After deployment, use
`/api/health` and non-mutating output checks only. See
`docs/mvp-production-readiness.md` for deployment gates and external blockers.
