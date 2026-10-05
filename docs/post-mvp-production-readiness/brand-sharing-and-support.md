# Brand, Link Preview, Help, and Contact Readiness

Last researched: 2026-10-04

This document defines the public-facing assets and content Srotiva needs before
launch. It supplements PR-012 (technical SEO), PR-007 (legal and trust), and
PR-014 (public content). It does not authorize inventing operator details,
contact addresses, service-level promises, or social accounts.

## Current state

- The attached orange rabbit mark is the authoritative Srotiva logo. The older
  RSS-style repository mark has been removed from application usage.
- The only supplied rabbit artwork is currently a 40x40 crop from a screenshot.
  It is used at native/smaller sizes for the application header and browser
  favicon without altering the design. A source SVG or transparent PNG of at
  least 512x512 is still required for sharp Apple and PWA assets.
- Public pages use a generated 1200x630 PNG card, complete Open Graph image
  metadata, and X `summary_large_image` metadata. The card says “Turn websites
  into reliable feeds.” The old Morsel card is archived outside `public/`.
- The help centre now covers the shipped MVP workflows and links to a public
  contact page. The temporary contact is `gouresh5901@gmail.com`; messages are
  described as reviewed on Indian business days during IST working hours,
  without an unsupported response-time SLA.
- Legal pages remain explicit drafts. India-first worldwide launch research is
  recorded in `global-legal-launch-research.md`.

## Browser and installed-app asset matrix

| Asset | Intended use | Requirement |
| --- | --- | --- |
| `favicon.ico` | Older browsers, bookmarks, and conventional `/favicon.ico` requests | Include crisp 16x16, 32x32, and 48x48 representations. |
| `icon.png` | Modern browser tabs | The exact supplied mark is available at 40x40; replace it from source artwork when supplied. |
| `apple-icon.png` | iOS/iPadOS home-screen bookmark | 180x180 PNG with an intentional opaque background and safe padding. |
| `icon-192.png` | Android/PWA install surfaces | 192x192 PNG, `purpose: "any"`. |
| `icon-512.png` | Android/PWA splash and install surfaces | 512x512 PNG, `purpose: "any"`. |
| `icon-maskable-512.png` | Adaptive Android/PWA icon | Keep the important mark inside the maskable safe zone; declare `purpose: "maskable"`. |
| Safari pinned-tab mask | Older macOS Safari pinned tabs | Optional monochrome SVG plus an explicit brand colour. |

The root metadata should also publish a browser theme colour through Next.js
viewport metadata. Icon responses must be public, cacheable, correctly typed,
and crawlable. Favicons should not be frequently renamed because search engines
may take days or weeks to recrawl them.

## Link-sharing preview contract

Create one default landscape preview image at 1200x630. It should contain the
Srotiva mark, product name, and a short durable value proposition, with generous
safe margins so crops remain readable. Keep it compressed and serve it from a
stable, absolute HTTPS URL.

Every shareable public page should emit server-rendered metadata containing:

- A concise page-specific `<title>` and meta description.
- One canonical URL on the production HTTPS host.
- `og:type`, `og:title`, `og:description`, `og:url`, and `og:image`.
- `og:site_name`, image width, height, MIME type, and meaningful image alt text.
- An X `summary_large_image` card with title, description, image, and image alt.
- An X site handle only if an official monitored account actually exists.

Open Graph is the interoperability baseline used by many messaging and social
preview clients. WhatsApp does not provide a stable public webmaster contract
that is sufficient to guarantee a preview, so its result must be verified on a
real deployed URL. The preview crawler must receive a successful response
without authentication, must not be blocked by robots or an edge firewall, and
must not be sent to an inaccessible image URL. Preview caches can be sticky;
material image changes should use a versioned asset URL.

The dashboard, login/signup, tokenized feed outputs, APIs, and account pages
must remain non-shareable/non-indexable even though they inherit safe defaults.

## Verification after deployment

1. Inspect the rendered HTML response, not only the React source, for canonical,
   Open Graph, and X metadata.
2. Confirm every image URL returns `200`, an image content type, and the declared
   dimensions over the public HTTPS hostname.
3. Test the homepage and one help article in WhatsApp, X, Facebook's Sharing
   Debugger, LinkedIn's Post Inspector, iMessage, and Slack/Discord where useful.
4. Test a fresh URL or versioned query when a platform has cached an old card.
5. Check browser tabs, bookmarks, iOS Add to Home Screen, and an installed PWA
   on light and dark browser chrome.
6. Run a broken-link crawl and verify the sitemap contains every intended
   public help/contact page and excludes private routes.

## Help centre information architecture

The public help hub should contain accurate, task-oriented articles for:

- Getting started and creating a feed.
- Supported source types and known unsupported sources.
- Feed discovery versus static webpage extraction.
- RSS, JSON, and CSV output formats.
- Refresh schedule, manual refresh, throttling, and refresh logs.
- Keyword allow/block filters and exact deduplication.
- Public versus private feeds and safe handling/rotation of private links.
- Workspace limits and quota errors.
- Common errors, request IDs, and steps to collect useful diagnostics.
- Account password, export, and deletion controls.
- Crawler identity, robots compliance, source attribution, and prohibited
  authentication/paywall bypass.
- Privacy, acceptable use, takedown, and security-reporting destinations.

Articles should describe only behavior that exists. Each should have a unique
title, description, canonical URL, useful cross-links, and a visible route back
to the product and contact page.

## Contact and trust pages

Create `/contact` as a public, indexed page with distinct routes for:

- Product support and account help.
- Privacy/data-rights requests.
- Security vulnerability reports.
- Abuse and source-owner/takedown requests.

For launch, monitored email links are safer than an unprotected form. A form
should be added only with a delivery provider, validation, spam controls,
rate-limiting, privacy disclosure, and a tested failure path. The page should
tell users to include a feed ID, request ID, timestamp, and source URL when
relevant, and explicitly tell them never to send passwords or private feed
tokens.

Also publish:

- A crawler/transparency page identifying Srotiva's user agent and behavior.
- A security policy page and RFC 9116 `/.well-known/security.txt` once a real
  security contact and expiration process exist.
- A status-page link only after an actual monitored status page exists.
- The operator's legal name and jurisdiction wherever counsel requires them.

Do not publish response-time promises until support ownership and coverage are
real. A plain statement such as “we review messages during business days” is
acceptable only after the owner confirms it.

## Remaining owner inputs

- Canonical production origin, including the chosen `www` or apex hostname.
- Public operator/legal name and jurisdiction.
- Exact support hours if Srotiva later publishes a response window or target.
- Whether Srotiva has an official X account or other public social profile.
- Original rabbit logo artwork as SVG or a transparent PNG of at least 512x512,
  or a decision to commission a distinct Srotiva mark.
- Domain-based support, privacy, security, abuse, and takedown aliases before
  broad public or paid launch.

## Primary references

- Next.js metadata and image conventions:
  <https://nextjs.org/docs/app/getting-started/metadata-and-og-images>
- Next.js metadata fields and `metadataBase` behavior:
  <https://nextjs.org/docs/app/api-reference/functions/generate-metadata>
- Open Graph protocol fields: <https://ogp.me/>
- Google favicon requirements:
  <https://developers.google.com/search/docs/appearance/favicon-in-search>
- Apple web clip icons:
  <https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html>
- Apple pinned-tab masks:
  <https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html>
- RFC 9116 security contact file: <https://www.rfc-editor.org/rfc/rfc9116.html>
