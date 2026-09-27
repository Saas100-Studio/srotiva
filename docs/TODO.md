# Morsel TODO

Non-critical improvements found during ticket review. Keep MVP tickets authoritative for implementation order.

- Native feeds: accept only image media types for `imageUrl` instead of any Atom enclosure or Media RSS content.
- Native feeds: use RSS GUIDs marked as permalinks when an item link is absent.
- Native feeds: support namespace-prefixed Atom roots and XHTML text constructs when real feeds require them.
- Output/UI: sanitize `descriptionHtml` at the rendering boundary before it is ever inserted into HTML.
