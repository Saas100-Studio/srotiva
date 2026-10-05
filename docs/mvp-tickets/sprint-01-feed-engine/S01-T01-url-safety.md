# S01-T01: URL Safety and SSRF Protection

Sprint: 01 - Feed Engine Core

## Objective

Build the URL validation layer that prevents SSRF and unsafe fetches before any user-supplied URL reaches the network.

## Exact Scope

- Validate and normalize HTTP/HTTPS URLs.
- Resolve DNS and block private, loopback, link-local, multicast, reserved, and metadata IP ranges.
- Re-check redirect targets through a helper that later fetcher code can call before following redirects.
- Block unsupported protocols, userinfo credentials, and unsafe ports.
- Do not perform HTTP fetching in this ticket.

## Files/modules to create or modify

- Create `src/lib/crawler/url-safety.mjs`
- Create `src/lib/crawler/ip-ranges.mjs`
- Create `src/test/url-safety.test.mjs`
- Modify `src/lib/api/errors.mjs`

## Database changes

None.

## API changes

None visible. Internal error codes introduced:

- `INVALID_URL`
- `UNSAFE_URL`
- `UNSUPPORTED_PROTOCOL`
- `UNSAFE_PORT`

## Frontend changes

None.

## Backend changes

- Export `normalizeUserUrl(value)` returning a canonical `URL`.
- Export `assertSafeUrlForFetch(value, options)` returning `{ url, hostname, resolvedAddresses }`.
- Export `assertSafeRedirectUrl(value, originalHostname)`.
- Use Node DNS promises for resolution.
- Block:
  - `localhost`
  - `127.0.0.0/8`
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
  - `169.254.0.0/16`
  - `::1`
  - `fc00::/7`
  - `fe80::/10`
  - `169.254.169.254`
  - URL credentials such as `https://user:pass@example.com`
  - non-standard ports except 80 and 443 for MVP

## Tests required

- Accepts `https://example.com/blog`.
- Converts uppercase host to lowercase.
- Rejects `not-a-url`.
- Rejects `file:///etc/passwd`.
- Rejects `http://localhost:3000`.
- Rejects `http://127.0.0.1`.
- Rejects `http://169.254.169.254/latest/meta-data`.
- Rejects URLs with credentials.
- Rejects redirects from public host to private IP.
- Rejects port 22 and accepts port 443.

## Acceptance criteria

- Every unsafe URL test fails with `SrotivaApiError`.
- Error codes are stable and documented in test names.
- No HTTP request is made by this module.
- `bun run test` passes.
- `bun run check` passes.

## Dependencies

- `S00-T01-runtime-config-and-errors.md`

