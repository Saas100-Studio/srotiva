# Morsel

Small bites from the live web.

Morsel is a Next.js product concept for turning websites, newsletters, and
social sources into clean feeds, embeddable widgets, automation bots,
integrations, and monitoring workflows.

## Run

Copy `.env.example` to `.env.local`, replace the placeholder values, then install
dependencies and start the development server:

```bash
cp .env.example .env.local
bun install
bun run dev
```

In separate terminals, start the refresh worker and scheduler processes:

```bash
bun run worker:refresh
bun run scheduler
```

These placeholders currently print readiness and exit cleanly. The worker
pipeline and due-feed scheduler are added in the next Sprint 04 tickets.

Required environment variables:

- `APP_URL`: Public base URL for the app. Use `http://localhost:3000` locally.
- `DATABASE_URL`: PostgreSQL connection URL.
- `SESSION_SECRET`: Random session secret containing at least 32 characters.
- `CRAWLER_USER_AGENT`: Identifiable user agent sent by the crawler.
- `FETCH_TIMEOUT_MS`: Positive request timeout in milliseconds.
- `FETCH_MAX_BYTES`: Positive maximum response size in bytes.
- `MANUAL_REFRESH_COOLDOWN_SECONDS`: Positive cooldown between manual refreshes.

## Database

Morsel uses PostgreSQL through Prisma. After setting `DATABASE_URL`, generate the
client and apply the development migrations:

```bash
bun run db:generate
bun run db:migrate
bun run db:seed
```

The seed command creates an idempotent development-only user, workspace, and
feed fixture. Run database tests only with `DATABASE_URL` pointing to a migrated
local development or test database; the tests create uniquely named records and
remove them when finished.

## Verify

```bash
bun run check
```

The check command runs lint, strict type checks, the Node test suite (including
database constraints), and a production Next.js build.
