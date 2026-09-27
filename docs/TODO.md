# Morsel TODO

Non-critical improvements found during ticket review. Keep MVP tickets authoritative for implementation order.

- Native feeds: accept only image media types for `imageUrl` instead of any Atom enclosure or Media RSS content.
- Native feeds: use RSS GUIDs marked as permalinks when an item link is absent.
- Native feeds: support namespace-prefixed Atom roots and XHTML text constructs when real feeds require them.
- Output/UI: sanitize `descriptionHtml` at the rendering boundary before it is ever inserted into HTML.
- Feed renderers: strip lone UTF-16 surrogates and other non-XML scalar values if renderers begin accepting text from outside the validated parser path.
- Feed renderers: add semantic RSS validation against an external reader or validator when interoperability testing is introduced.
- Feed discovery: replace the small alternate-link attribute scanner with an HTML parser if malformed real-world markup or broader entity decoding causes missed feeds.
- S02-T03: recognize a directly submitted RSS/Atom URL before treating the response as an HTML page that needs discovery.
