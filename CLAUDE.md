# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Srotiva is a Next.js SaaS that turns websites and native RSS/Atom sources into reliable RSS, JSON, and CSV feeds. Treat this repository as a production product, not a demo sandbox. The codebase is currently pre-alpha and under active MVP construction — see "Where things stand" below before assuming a feature exists.

Detailed product scope lives in `docs/rss-saas-product-requirements.md`; implementation work is broken into tickets under `docs/mvp-tickets/`. `AGENTS.md` at the repo root is the canonical compact agent guide — read it, since it contains the authoritative MVP scope boundary, security rules, and workflow rules and is kept in sync with this file's intent.

## Commands

- Install dependencies: `bun install`
- Start dev server: `bun run dev`
- Build production app: `bun run build` / `bun run start`
- Lint: `bun run lint`
- Type check: `bun run typecheck` (runs `next typegen` first, then `tsc --noEmit` — always use this over a bare `tsc`, since Next's route types must be regenerated first)
- Run full test suite: `bun run test` (equivalent to `node --env-file-if-exists=.env.local --test src/test/*.test.ts`)
- Run a single test file: `node --env-file-if-exists=.env.local --test src/test/<file>.test.ts`
- Full verification gate: `bun run check` — runs lint, typecheck, test, and build in sequence; this is the command to run before reporting any ticket/task complete
- Database: `bun run db:generate` (Prisma client), `bun run db:migrate` (dev migration), `bun run db:seed` (idempotent dev fixture: user + workspace + feed)

This project uses **Bun** as the package manager/runner (pinned via `packageManager` in `package.json`), but tests run through Node's native `--test` runner with TypeScript type-stripping (Node 24+) — no `ts-node`/`tsx`.

Some tests (e.g. `src/test/db-schema.test.ts`) require a real, migrated PostgreSQL database via `DATABASE_URL` — they create uniquely-suffixed records and clean them up afterward. Only point `DATABASE_URL` at a database you're fine writing test data to.

## Architecture

- `src/app/` — Next.js App Router routes and pages.
- `src/components/` — React UI components.
- `src/lib/api/` — shared API primitives: `SrotivaApiError` (typed error with `status`/`code`/`details`) and `jsonOk`/`jsonError` response helpers that wrap every route response in `{ data, requestId }` or `{ error, requestId }`, with `x-request-id` set on every response. Route handlers should throw `SrotivaApiError` and let a shared catch path call `jsonError`, rather than hand-rolling error responses.
- `src/lib/config/` — `env.ts` (`loadEnv`) and `limits.ts` (`loadLimits`) validate and parse required environment variables eagerly (throwing on missing/invalid values) rather than reading `process.env` ad hoc elsewhere in the codebase.
- `src/lib/db/` — `client.ts` exports a singleton `getDb()` `PrismaClient` (cached on `globalThis` outside production to survive dev hot-reload); `repositories/` holds one module per aggregate (`feeds.ts`, `jobs.ts`, `users.ts`, `workspaces.ts`) — domain code should go through repository functions rather than calling `getDb()`/Prisma directly from routes or components.
- `prisma/schema.prisma` — the source of truth for the data model. Key aggregates: `User` → `Workspace` (via `WorkspaceMember` roles: owner/admin/editor/viewer/billing/support) → `Feed` → `FeedSource` / `FeedItem` (deduplicated via a `(feedId, fingerprint)` unique constraint) / `FeedFilter` (whitelist/blacklist/field-rule/dedup/similarity, scoped to workspace or feed) / `FeedRefreshJob` (queued/running/succeeded/failed/cancelled, database-backed — no Redis/BullMQ for the MVP) / `ErrorLog` / `AuditLog` / `UsageLimit`. Enums are mapped to lowercase snake_case Postgres enum values via `@map`.
- Tests live in `src/test/*.test.ts`, mirroring the module they cover (`api-errors.test.ts`, `config-env.test.ts`, `feed-builder.test.ts`, `db-schema.test.ts`). Feed parsing/extraction fixtures belong in `src/test/fixtures/`.

`src/lib/feed-builder.ts` is early prototype/placeholder logic (hardcoded platform detection, fake feed URLs under `rss-studio.local`) predating the real MVP feed engine tickets (Sprint 01–02: URL safety, HTTP fetcher, native parser, discovery, extraction). Don't treat it as the real implementation pattern for feed generation — check `docs/mvp-tickets/PROGRESS.md` for what's actually landed before building on top of it.

## Where things stand

`docs/mvp-tickets/PROGRESS.md` is the live source of truth for what's implemented vs. not — read it (and update it after finishing a ticket) rather than inferring completeness from file existence. As of the last update, Sprint 00 (Foundation) is in progress: runtime config/API errors, TypeScript/lint setup, and the database schema/client are done; auth and authorization are not started. Everything in Sprints 01–05 (feed engine, discovery/creation APIs, dashboard UI, refresh jobs, filters/hardening) is not started.

## Working conventions (from AGENTS.md — read that file for the full list)

- Work one ticket at a time, starting from the lowest-numbered unfinished ticket in `docs/mvp-tickets/README.md`; keep changes scoped to that ticket unless a test exposes a required supporting change.
- TypeScript throughout: `.ts` for lib/test modules, `.tsx` for React components, `strict` mode; root config files (`next.config.mjs`, `eslint.config.mjs`) stay `.mjs`. Keep explicit `.ts`/`.tsx` extensions in relative imports (needed for Node's test runner to resolve them).
- Security: treat all user-submitted URLs as hostile. Never fetch a URL before SSRF validation (block localhost, private/link-local IPs, metadata endpoints, unsafe protocols/ports, credentialed URLs, unsafe redirects) once the fetcher exists. No paywall/login/captcha/anti-bot bypasses. Respect robots policy for crawler behavior.
- Add/update tests for every behavior change; prefer deterministic fixtures over live network calls; explicitly test unsafe-URL cases when touching crawler/fetcher/discovery/refresh/output code.
- Update `docs/mvp-tickets/PROGRESS.md` at the end of each ticket (status, commands run, blockers, env notes).
- Pinned toolchain versions matter here and are load-bearing, not arbitrary: `typescript ~5.9.0` (TS 7 breaks `typescript-eslint@8`), `eslint ~9.39.0` (ESLint 10 breaks `eslint-plugin-react` via `eslint-config-next`), `prisma`/`@prisma/client` `6.19.3`. Don't bump these without checking `docs/mvp-tickets/PROGRESS.md`'s Decisions section first.
