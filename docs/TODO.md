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
- Public outputs: add a globally resolvable output slug and hashed private access token in S02-T05; feed slugs are currently unique only within a workspace.
