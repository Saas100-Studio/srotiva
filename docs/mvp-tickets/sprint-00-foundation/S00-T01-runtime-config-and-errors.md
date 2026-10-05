# S00-T01: Runtime Config and API Error Conventions

Sprint: 00 - Foundation

## Objective

Create the runtime configuration and shared API response conventions that every MVP backend route will use.

## Exact Scope

- Add typed runtime environment access for database, session, app URL, crawler limits, and refresh limits.
- Add a shared error class and JSON response helpers.
- Add basic request ID generation for logs and API responses.
- Add tests that prove missing required env vars fail fast and API errors have the expected shape.
- Do not add a database client, auth, feed parsing, or route handlers in this ticket.

## Files/modules to create or modify

- Create `src/lib/config/env.mjs`
- Create `src/lib/config/limits.mjs`
- Create `src/lib/api/errors.mjs`
- Create `src/lib/api/responses.mjs`
- Create `src/test/config-env.test.mjs`
- Create `src/test/api-errors.test.mjs`
- Modify `README.md`
- Modify `.env.example`

## Database changes

None.

## API changes

None visible to users. This ticket defines the internal response envelope:

- Success: `{ "data": ..., "requestId": "..." }`
- Failure: `{ "error": { "code": "...", "message": "...", "details": {} }, "requestId": "..." }`

## Frontend changes

None.

## Backend changes

- Implement `loadEnv(overrides = process.env)` that returns normalized values for:
  - `APP_URL`
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `CRAWLER_USER_AGENT`
  - `FETCH_TIMEOUT_MS`
  - `FETCH_MAX_BYTES`
  - `MANUAL_REFRESH_COOLDOWN_SECONDS`
- Implement `SrotivaApiError` with `status`, `code`, `message`, and `details`.
- Implement `jsonOk(data, init)` and `jsonError(error, init)`.
- Implement `createRequestId()` using Node crypto random UUID.
- Document required env vars in `.env.example` and `README.md`.

## Tests required

- `src/test/config-env.test.mjs`
  - Returns normalized numeric env values.
  - Throws for missing `DATABASE_URL`.
  - Throws for weak `SESSION_SECRET` shorter than 32 characters.
- `src/test/api-errors.test.mjs`
  - Serializes `SrotivaApiError` to the agreed error envelope.
  - Serializes unexpected errors as `INTERNAL_ERROR` without leaking stack traces.

## Acceptance criteria

- `bun run test` passes.
- `bun run check` passes.
- No route handler needs to define its own error envelope.
- `.env.example` lists every env var needed by this ticket.
- README explains copying `.env.example` to `.env.local` for local development.

## Dependencies

None.

