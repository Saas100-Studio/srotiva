# Srotiva Agent Guide

Srotiva is a Next.js SaaS for turning websites and native RSS/Atom sources into reliable RSS, JSON, and CSV feeds. Treat this repository as a production product, not a demo sandbox.

Keep this file compact. Put detailed product scope in `docs/rss-saas-product-requirements.md` and implementation work in `docs/mvp-tickets/`.

## Current Priority

Build the MVP first. Do not start advanced features until the MVP is production-ready.

MVP includes:

- Auth with a default workspace.
- Feed creation by URL.
- Native RSS/Atom parsing.
- Simple static webpage extraction.
- Feed preview and saved feed dashboard.
- RSS, JSON, and CSV output endpoints.
- Scheduled refresh and manual refresh throttling.
- Exact deduplication.
- Basic keyword whitelist/blacklist filters.
- Error states, refresh logs, URL safety, SSRF protection, and basic help pages.

Out of scope until the MVP is done:

- Visual RSS builder.
- Social/platform adapters beyond generic website/native feed discovery.
- Newsletter-to-RSS.
- Widgets.
- Webhooks and API keys.
- Slack, Discord, Telegram, and email digests.
- Billing automation, team collaboration, full admin panel, translation, and AI summaries.

## Project Map

- `src/app/` - Next.js app routes and pages.
- `src/components/` - React UI components.
- `src/lib/` - domain logic and reusable modules.
- `src/test/` - Node test files.
- `docs/rss-saas-product-requirements.md` - product and architecture source of truth.
- `docs/mvp-tickets/README.md` - sprint order and ticket index.
- `docs/mvp-tickets/PROGRESS.md` - current ticket status, blockers, release notes, and environment notes.
- `docs/mvp-tickets/**/S*-T*.md` - one implementation ticket per file.

## Commands

- Install dependencies: `bun install`
- Start dev server: `bun run dev`
- Run tests: `bun run test`
- Lint: `bun run lint`
- Type check: `bun run typecheck`
- Build production app: `bun run build`
- Full verification: `bun run check` (runs lint, typecheck, test, and build)

Use Bun because `package.json` declares `bun@1.3.9`.

## How to Work

- For implementation work, start with the lowest-numbered unfinished ticket in `docs/mvp-tickets/README.md`.
- Read `docs/mvp-tickets/PROGRESS.md`, the ticket file, and this guide before editing code.
- Use the PRD only when the ticket needs broader product context; do not reread or paste the whole PRD for every ticket.
- Keep changes scoped to the active ticket unless tests expose a required supporting change.
- Update `docs/mvp-tickets/PROGRESS.md` at the end of each ticket with status, commands run, blockers, and next environment needs.
- Prefer small, focused modules over large mixed-responsibility files.
- Write TypeScript: ESM, `.ts` for library/test modules and `.tsx` for React components, under `strict` mode. Config files at the repo root (`next.config.mjs`, `eslint.config.mjs`) stay `.mjs`.
- Keep explicit file extensions in relative imports (e.g. `./limits.ts`) so Node's test runner resolves them.
- Some tickets written before `S00-T01b` still list `.mjs`/`.jsx` files. Implement them as `.ts`/`.tsx`; the TypeScript convention supersedes those extensions.
- Use `rg` for search.
- Use `apply_patch` for manual file edits.
- Do not add production dependencies without a clear reason in the final summary.

## Product and Security Rules

- Treat user-submitted URLs as hostile.
- Never fetch a URL before SSRF validation.
- Block localhost, private IPs, link-local IPs, metadata endpoints, unsafe protocols, unsafe ports, credentialed URLs, and unsafe redirects.
- Do not implement paywall, login, captcha, or anti-bot bypasses.
- Respect robots policy as product policy for crawler behavior.
- Keep public output routes limited to active, allowed feed items.
- Never commit secrets, API keys, cookies, tokens, `.env.local`, database dumps, or production logs.

## Testing Rules

- Add or update tests for every behavior change.
- Use focused tests first, then run `bun run check` before reporting completion.
- Prefer deterministic fixtures over live network calls.
- For feed parsing and extraction, store fixtures in `src/test/fixtures/`.
- Test unsafe URL cases explicitly when touching crawler, fetcher, discovery, refresh, or output code.

## Frontend Rules

- Build the real product workflow first, not marketing pages.
- Keep dashboards dense, calm, and operational.
- Do not add visible feature explanations for features that are not implemented.
- Show actionable empty, loading, and error states.
- Do not let UI text overlap or overflow on mobile.

## Git and Review

- Do not revert user changes unless explicitly asked.
- Keep unrelated refactors out of feature tickets.
- Before finishing, review `git diff` for accidental scope creep, secrets, dead code, and unsupported advanced features.
- Final summaries should include changed files, commands run, verification results, and any remaining risk.

## Definition of Done

A ticket is done only when:

- Its acceptance criteria are met.
- Relevant tests were added or updated.
- Lint and type checks pass under `strict` mode.
- `bun run check` passes, or any failure is reported with the exact blocker.
- `docs/mvp-tickets/PROGRESS.md` is updated.
- The implementation stays inside MVP scope.
- Public behavior matches the PRD and the ticket file.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
