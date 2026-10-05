# S01-T02: HTTP Fetcher and Robots Policy

Sprint: 01 - Feed Engine Core

## Objective

Create the safe HTTP fetcher used by feed discovery, native feed parsing, and webpage extraction.

## Exact Scope

- Fetch public HTTP/HTTPS documents after URL safety validation.
- Enforce timeout, redirect count, response-size cap, content-type capture, and crawler user-agent.
- Fetch and parse basic robots.txt allow/disallow policy for the configured user-agent.
- Return structured fetch results and fetch errors.
- Do not parse RSS, Atom, or HTML in this ticket.

## Files/modules to create or modify

- Create `src/lib/crawler/http-fetcher.mjs`
- Create `src/lib/crawler/robots-policy.mjs`
- Create `src/test/http-fetcher.test.mjs`
- Create `src/test/robots-policy.test.mjs`
- Modify `src/lib/config/limits.mjs`

## Database changes

None.

## API changes

None visible. Internal error codes introduced:

- `FETCH_TIMEOUT`
- `FETCH_TOO_LARGE`
- `FETCH_REDIRECT_LIMIT`
- `ROBOTS_DISALLOWED`
- `FETCH_HTTP_ERROR`

## Frontend changes

None.

## Backend changes

- Export `fetchDocument(url, options)` returning:
  - `finalUrl`
  - `status`
  - `headers`
  - `contentType`
  - `bodyText`
  - `bytes`
  - `durationMs`
- Apply `assertSafeUrlForFetch` before the first request and `assertSafeRedirectUrl` before following redirects.
- Default timeout: `FETCH_TIMEOUT_MS`.
- Default max size: `FETCH_MAX_BYTES`.
- User-agent: `CRAWLER_USER_AGENT`.
- Export `checkRobotsAllowed({ targetUrl, userAgent })`.
- Cache robots responses in memory for the current process for 10 minutes.

## Tests required

- Sends configured crawler user-agent.
- Stops after configured redirect count.
- Blocks redirect to private IP.
- Aborts responses above max byte size.
- Times out slow responses.
- Allows path when robots has no matching disallow.
- Blocks path when robots disallows the crawler user-agent.
- Allows fetch when robots.txt returns 404.

## Acceptance criteria

- All network access flows through URL safety checks.
- Fetcher returns structured data for 2xx responses.
- Fetcher throws `SrotivaApiError` with stable codes for timeout, large body, unsafe redirect, and robots disallow.
- `bun run test` passes.
- `bun run check` passes.

## Dependencies

- `S01-T01-url-safety.md`

