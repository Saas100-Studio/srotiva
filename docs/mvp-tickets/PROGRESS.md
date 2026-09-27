# Morsel MVP Progress

Last updated: 2026-09-27

Use this file to help Codex agents understand the current implementation state without rereading the full PRD. Update it after every ticket.

## Current State

- Current sprint: Sprint 03 - User Dashboard
- Next ticket (not started): `S03-T01-dashboard-shell.md`
- Release stage: pre-alpha, internal development only
- User-facing release: not ready

## How to Update This File

After each ticket, update:

- Ticket status.
- Commit hash or branch if available.
- Commands run.
- Blockers or human inputs needed.
- Environment variables needed for the next ticket.
- Draft release notes for the sprint if user-visible behavior changed.

Status values:

- `Not Started`
- `In Progress`
- `Blocked`
- `Done`

## Environment Notes

Do not write real secrets in this file.

| Need | Required By | Status | Notes |
| --- | --- | --- | --- |
| `APP_URL` | S00-T01 | Documented | Local value can be `http://localhost:3000`. |
| `DATABASE_URL` | S00-T02 | Configured; migrations verified | Present in `.env.local`. Database-backed tests pass; a transient Neon outage was observed before S01-T03 and cleared on retry. |
| `SESSION_SECRET` | S00-T01, S00-T03 | Configured | A generated 64-character secret is present in `.env.local`. Do not copy it into source control or documentation. |
| `CRAWLER_USER_AGENT` | S00-T01, S01-T02 | Configured | An identifiable product user agent is present in `.env.local`. |
| `FETCH_TIMEOUT_MS` | S00-T01, S01-T02 | Configured | Present in `.env.local`; suggested local value is `10000`. |
| `FETCH_MAX_BYTES` | S00-T01, S01-T02 | Configured | Present in `.env.local`; suggested local value is `2000000`. |
| `MANUAL_REFRESH_COOLDOWN_SECONDS` | S00-T01, S04-T03 | Documented | Suggested local value: `300`. |
| External provider keys | Later advanced features | Not needed for MVP | No Stripe, Slack, Discord, Telegram, or email keys in strict MVP. |

## Ticket Status

| Ticket | Status | Branch/Commit | Commands Run | Notes |
| --- | --- | --- | --- | --- |
| S00-T01 Runtime Config and API Errors | Done | `main` | `node --test src/test/config-env.test.mjs src/test/api-errors.test.mjs`; `node --test src/test/api-errors.test.mjs`; `bun run check` | 5 API-focused tests passed; 12 full-suite tests and production build passed. Error responses preserve their `MorselApiError` HTTP status. |
| S00-T01b TypeScript and Lint Setup | Done | `main` / `8e4ca03` | `bun install`; `bun run typecheck`; `bun run lint`; `bun run check` | Standalone typecheck regenerates Next.js route types before running strict TypeScript. All 13 tests, typecheck, lint, and build pass. See the ticket for setup detail and Decisions for the `typescript`/`eslint` version pins. |
| S00-T02 Database Schema and Client | Done | `main` / `59e709d` | `bunx prisma format`; `bunx prisma validate`; `bunx prisma generate`; `bunx prisma migrate dev --name init_mvp_schema --create-only`; `bunx prisma migrate dev`; `bun run db:seed`; `bunx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`; `bunx prisma migrate deploy`; `node --env-file=.env.local --test src/test/db-schema.test.ts`; `bun run check` | Initial PostgreSQL schema and migration, reusable client, repository helpers, idempotent development seed, feed/workspace tenant-integrity constraints, and constraint tests are complete. All 20 tests, lint, typecheck, and production build pass. |
| S00-T03 Auth and Default Workspace | Done | `main` | `bun add argon2`; `node --env-file-if-exists=.env.local --test src/test/auth-password.test.ts src/test/auth-session.test.ts src/test/auth-routes.test.ts`; `bun run check` | Argon2id password auth, signed 30-day session cookies, signup/login/logout/me APIs, atomic default workspace ownership with randomized slug collision fallback, minimal auth pages, and the authenticated dashboard landing are complete. All 33 tests, lint, strict typecheck, and production build pass. No database migration was needed. |
| S00-T04 Authorization and Audit Logs | Done | `main` | `node --env-file-if-exists=.env.local --test src/test/workspace-access.test.ts src/test/audit-log.test.ts src/test/auth-routes.test.ts`; `bun run check` | Owner/editor/viewer hierarchy, active-workspace request context, cross-workspace denial, audit helper, and successful signup/login/logout audit events are complete. Signup and its audit row commit atomically. Both required audit indexes already existed, so no migration was needed. All 42 tests, lint, strict typecheck, and production build pass. |
| S01-T01 URL Safety and SSRF Protection | Done | `main` | `node --test src/test/url-safety.test.ts`; `bun run check` | Canonical HTTP(S) URL validation, credential and port rejection, deterministic DNS resolution, public-IP enforcement across IPv4/IPv6, metadata and localhost blocking, and redirect-target revalidation are complete. All 58 tests, lint, strict typecheck, and production build pass. No HTTP requests or new dependencies were added. |
| S01-T02 HTTP Fetcher and Robots Policy | Done | `main` | `node --env-file-if-exists=.env.local --test src/test/http-fetcher.test.ts src/test/robots-policy.test.ts`; `bun run lint`; `bun run typecheck`; `node --env-file-if-exists=.env.local --test src/test/http-fetcher.test.ts src/test/robots-policy.test.ts src/test/url-safety.test.ts`; `bun run check` | DNS-pinned manual redirects, streamed size limits, discarded-body cancellation, request timeout, crawler user-agent, structured results/errors, exact product-token robots policy, and a 10-minute process cache are complete. All 71 tests, lint, strict typecheck, and production build pass. |
| S01-T03 Native Feed Parser and Fingerprints | Done | `main` | `bun add fast-xml-parser`; `node --env-file-if-exists=.env.local --test src/test/native-parser.test.ts src/test/fingerprint.test.ts`; `bun run check` | RSS 2.0 and Atom 1.0 normalization, diagnostic raw fields, media/enclosure images, deterministic SHA-256 fingerprints, safe standard XML entity decoding, URL scheme filtering, and invalid-feed errors are complete. All 81 tests, lint, strict typecheck, and production build pass. |
| S01-T04 Feed Renderers | Done | `main` | `node --env-file-if-exists=.env.local --test src/test/feed-renderers.test.ts src/test/csv-safety.test.ts`; `bun run check` | Deterministic RSS 2.0, explicitly projected JSON, spreadsheet-safe CSV, and public/private cache policies are complete. All 87 tests, lint, strict typecheck, and production build pass. No dependency or database changes were needed. |
| S02-T01 Native Feed Discovery | Done | `main` | `node --env-file-if-exists=.env.local --test src/test/native-feed-discovery.test.ts src/test/http-fetcher.test.ts src/test/robots-policy.test.ts src/test/native-parser.test.ts`; `bun run check` | Safe page fetch, RSS/Atom alternate-link discovery, final-URL resolution, deduplication, same-origin common-path probes, native-feed validation, and pre-redirect robots enforcement are complete. All 95 tests, lint, strict typecheck, and production build pass. |
| S02-T02 Static HTML Extractor | Done | `main` | `node --env-file-if-exists=.env.local --test src/test/html-extractor.test.ts`; `bun run check` | Deterministic static article/card extraction, URL normalization, exact URL deduplication, plain-text description cleanup, confidence enforcement, fingerprints, fallback images, and the 25-item preview cap are complete. All 100 tests, lint, strict typecheck, and production build pass. |
| S02-T03 Feed Discover Preview API | Done | `main` | `node --env-file-if-exists=.env.local --test src/test/feed-discover-api.test.ts`; `bun run check` | Authenticated active-workspace previews prefer direct or discovered RSS/Atom, fall back to static HTML, cap results at 10 items, preserve crawler safety and robots checks, validate request shapes, return stable ticket error codes, and write no feed rows. All 110 tests, lint, strict typecheck, and production build pass. |
| S02-T04 Feed Save and Items API | Done | `main` | `node --env-file-if-exists=.env.local --test src/test/feed-save-api.test.ts src/test/feed-items-api.test.ts`; `bun run check` | Atomic native/webpage saves, server-recomputed exact fingerprints, tenant-role enforcement, feed CRUD, projected detail/list/item responses, null-last cursor pagination, cross-workspace mutation guards, and row-retaining soft delete are complete. All 113 tests, lint, strict typecheck, and production build pass. No migration or dependency was needed. |
| S02-T05 Public RSS, JSON, and CSV Output Endpoints | Done | `main` | `bunx prisma format`; `bunx prisma validate`; `bunx prisma generate`; `bunx prisma migrate deploy`; `bunx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`; `node --env-file-if-exists=.env.local --test src/test/public-output-routes.test.ts src/test/feed-save-api.test.ts src/test/feed-renderers.test.ts src/test/csv-safety.test.ts`; `bun run check` | Globally unique output slugs, hashed deterministic private tokens, owner-facing tokenized URLs, public/unlisted/private access, active-only bounded items, canonical token-free RSS self links, cache policies, and RSS/JSON/CSV routes are complete. Database and Prisma schema have no drift. All 114 tests, lint, strict typecheck, and production build pass. |
| S03-T01 Authenticated Dashboard Shell | Not Started |  |  | First user-facing sprint starts here. |
| S03-T02 Feed Creation UI | Not Started |  |  |  |
| S03-T03 Feed Detail UI | Not Started |  |  |  |
| S03-T04 Help, Empty States, and Error States | Not Started |  |  |  |
| S04-T01 Refresh Queue and Worker Shell | Not Started |  |  | MVP uses database-backed jobs first. |
| S04-T02 Refresh Worker Pipeline | Not Started |  |  |  |
| S04-T03 Manual Refresh API and Throttle | Not Started |  |  |  |
| S04-T04 Scheduler and Feed Health | Not Started |  |  |  |
| S05-T01 Basic Filter Engine | Not Started |  |  |  |
| S05-T02 Filter API | Not Started |  |  |  |
| S05-T03 Filter UI | Not Started |  |  |  |
| S05-T04 Rate Limits and Observability | Not Started |  |  |  |
| S05-T05 MVP Production Readiness Gate | Not Started |  |  |  |

## Sprint Release Notes Draft

### Sprint 00 - Foundation

Release type: internal only.

Expected user-facing change: none.

Message: Core app infrastructure now supports secure account auth, automatic first-workspace creation, tenant-safe role checks, and audit logging for future feed workflows.

### Sprint 01 - Feed Engine Core

Release type: internal only.

Expected user-facing change: none.

Message: The feed engine can safely validate URLs, fetch public documents, parse native RSS/Atom feeds, fingerprint items, and render feed outputs internally.

### Sprint 02 - Discovery and Creation APIs

Release type: internal/API preview.

Expected user-facing change: technical testers may be able to create and inspect feeds through APIs.

Message: URL-to-feed creation is available behind the scenes, including preview, save, item storage, and RSS/JSON/CSV endpoints.

### Sprint 03 - User Dashboard

Release type: private alpha.

Expected user-facing change: early users can sign up, create a feed from a URL, preview items, save feeds, and copy output links.

Message: Private alpha is open for creating your first feeds and using RSS, JSON, and CSV links.

### Sprint 04 - Refresh Jobs

Release type: alpha update.

Expected user-facing change: saved feeds refresh automatically, users can manually refresh, and feed health is visible.

Message: Feeds now update automatically and show refresh status, making Morsel usable for real monitoring workflows.

### Sprint 05 - Filters and Production Hardening

Release type: MVP beta.

Expected user-facing change: users can filter noisy feed items, see better errors, and rely on a more stable beta product.

Message: MVP beta is ready with feed creation, auto-refresh, output links, basic filtering, safer rate limits, and production readiness checks.

## Blockers

No blockers recorded. S03-T01 needs no new environment variables.

## Decisions

- Use strict TypeScript and ESLint from the foundation sprint, gated through `bun run check`. Type/lint errors are the main automated check given lighter human review on this project. See `S00-T01b`.
- Run `next typegen` before `tsc --noEmit` so standalone type checks always validate freshly generated Next.js route types rather than depending on existing `.next` output.
- Run tests via Node's native TypeScript type stripping (Node 24+); no `ts-node`/`tsx` needed.
- Pin `typescript` to `~5.9.0` — TypeScript 7 breaks `typescript-eslint@8`. See `S00-T01b`.
- ESLint config is `eslint-config-next/core-web-vitals` + `typescript-eslint` recommended, not hand-picked plugins. See `S00-T01b`.
- Pin `eslint` to `~9.39.0` — ESLint 10 breaks `eslint-plugin-react` (pulled in via `eslint-config-next`). See `S00-T01b`.
- Use PostgreSQL plus Prisma for the MVP database path.
- Pin Prisma ORM and Prisma Client to `6.19.3` for the established Node client runtime used by this ticket. Prisma CLI configuration loads `.env.local` only when `DATABASE_URL` is not already provided by the environment.
- Use PostgreSQL `citext` for case-insensitive email uniqueness. The initial migration enables the extension before creating email columns.
- Enforce matching feed and workspace IDs for feed items, feed filters, and refresh jobs with composite foreign keys to prevent cross-workspace records.
- Database tests create uniquely named records, remove them after each suite, and load `.env.local` only when it exists so CI-provided environment variables remain supported.
- Use database-backed refresh jobs for MVP before adding Redis/BullMQ.
- Use Argon2id with 19 MiB memory, two iterations, and one lane for MVP password hashing. `argon2` is the only production dependency added by S00-T03.
- Use a 30-day HMAC-SHA256 signed session cookie named `morsel_session`. It is `HttpOnly`, `SameSite=Lax`, and `Secure` in production; signing uses `SESSION_SECRET`. No session migration was added because the required user password and login metadata already exist and server-side session revocation is outside this ticket's simple MVP auth scope.
- Limit the MVP workspace authorization hierarchy to `OWNER > EDITOR > VIEWER`. Other roles already present in the broad schema do not receive MVP resource access until their behavior is explicitly implemented.
- Build request context from the authenticated user's active workspace and revalidate its active membership through the shared role helper. Successful password signup/login and authenticated logout events write user-targeted audit rows; signup creates its audit row in the account transaction so partial signup state cannot survive an audit failure. The required audit indexes were already present in the initial schema.
- Fail URL safety closed: allow only HTTP/HTTPS without credentials on ports 80/443, require every DNS answer to be a public IPv4/IPv6 address, and re-run the same validation for redirects. Literal and obfuscated IP hosts are normalized before range checks; URL fragments are removed because they are not sent in HTTP requests.
- Follow redirects manually with a five-hop default so each target is revalidated before network access, and pin each connection to its validated public addresses to prevent DNS rebinding. Cancel discarded bodies, stream accepted bodies under the configured byte cap, apply one timeout across the complete fetch, and treat non-2xx responses as stable fetch errors. Cache `robots.txt` by origin for ten minutes; combine exact product-token groups, fall back to the wildcard group, and use longest-rule precedence with `Allow` winning ties.
- Use `fast-xml-parser` with entity processing disabled for RSS 2.0 and Atom 1.0 normalization. Fingerprint items with Node's SHA-256 in canonical URL, source ID, then normalized title/date priority, always scoped by feed URL.
- Render normalized feeds with deterministic RSS 2.0, explicitly projected public JSON (excluding raw diagnostics), and stable-column CSV serializers. Prefix CSV cells whose first non-whitespace character is `=`, `+`, `-`, or `@`; public output may cache for 60 seconds with 300 seconds stale-while-revalidate, while tokenized private output is `no-store`.
- Discover native feeds from typed RSS/Atom alternate links first, then sequentially probe five same-origin conventional paths only when no valid hint exists. Reuse the secure fetcher and cached robots policy for every request, and validate probed documents with the native parser before returning them.
- Parse static HTML with Cheerio because Node has no built-in server-side DOM parser. Prefer repeated `article` elements, then heading-based cards inside `main`; require at least two unique linked items, cap previews at 25, and return deterministic confidence and missing-field warning codes.
- Keep preview item raw diagnostics in the authenticated discovery response so S02-T04 can save the preview without reformatting; network response-size limits and the 10-item preview cap bound the payload.
- Give every feed a globally unique output slug. Derive private output tokens with HMAC-SHA256 from the random feed ID and `SESSION_SECRET`, store only a SHA-256 hash, and expose tokenized owner URLs only through authenticated feed responses. Public and unlisted outputs use public caching; private and denied responses use no-store. RSS self links use configured `APP_URL` without bearer tokens.
- Keep keyword/topic feed creation out of strict MVP; consider Google News keyword feeds as a post-MVP or MVP+ ticket.
- Keep advanced integrations out of strict MVP until feed creation, refresh, filtering, and outputs are production-ready.
