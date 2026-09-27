# Morsel TODO

Non-critical improvements found during ticket review. Keep MVP tickets authoritative for implementation order.

- Native feeds: accept only image media types for `imageUrl` instead of any Atom enclosure or Media RSS content.
- Native feeds: use RSS GUIDs marked as permalinks when an item link is absent.
- Native feeds: support namespace-prefixed Atom roots and XHTML text constructs when real feeds require them.
- Output/UI: sanitize `descriptionHtml` at the rendering boundary before it is ever inserted into HTML.
- Feed renderers: strip lone UTF-16 surrogates and other non-XML scalar values if renderers begin accepting text from outside the validated parser path.
- Feed renderers: add semantic RSS validation against an external reader or validator when interoperability testing is introduced.
- Feed discovery: replace the small alternate-link attribute scanner with an HTML parser if malformed real-world markup or broader entity decoding causes missed feeds.
- Feed discovery: avoid fetching an ordinary submitted webpage twice when native link discovery needs the already-fetched HTML.
- Feed discovery: thread injected network collaborators through nested native discovery if tests need the real nested path without network access.
- HTML extractor: add JSON-LD/OpenGraph article dates and lazy-loaded/srcset images when real fixture failures justify broader heuristics.
- HTML extractor: broaden repeated-card detection beyond `article` and heading-based cards when production pages demonstrate a missed stable pattern.
- Public outputs: add explicit private-token rotation when users need to revoke a shared output URL.
- Dashboard: add workspace switching only after an active-workspace selection API and session behavior are defined.
- Dashboard: add the settings destination before public launch; the shell link is reserved but no settings workflow is in the current MVP ticket pack.
- Dashboard: keep account identity visible in the compact mobile shell when the final navigation pattern is designed.
- Feed creation UI: add browser-level discovery and save-flow coverage when the project adopts an end-to-end test harness.
- Feed creation UI: move focus to loading, error, and preview regions if usability testing shows keyboard users miss state changes.
- Feed detail UI: add browser-level coverage for clipboard, pause/resume, and confirmed deletion when the project adopts an end-to-end test harness.
- Public outputs: before supporting `SESSION_SECRET` rotation, resynchronize private-token hashes on authenticated detail access or introduce a dedicated stable output-token secret.
- Refresh queue: reclaim stale running jobs after a worker lease timeout once long-running workers are deployed.
- Refresh queue: add concurrent-claim and future-`nextRetryAt` integration tests if queue contention or retry scheduling becomes production-critical.
- Refresh queue: make terminal transitions retry-idempotent if production processing can redeliver completion or failure writes; worker ownership is now enforced by the real worker.
- Refresh pipeline: send conditional `If-None-Match`/`If-Modified-Since` requests and handle `304` once the shared fetcher accepts safe caller headers.
- Refresh pipeline: persist `robotsStatus=disallowed` on robots denials and suppress noisy error logs for stale jobs that encounter an already paused or deleted feed.
- Manual refresh: add a live cooldown countdown and browser-level click coverage if static retry feedback proves unclear in usability testing.
