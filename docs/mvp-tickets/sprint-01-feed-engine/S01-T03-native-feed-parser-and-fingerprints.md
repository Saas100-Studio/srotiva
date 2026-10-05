# S01-T03: Native Feed Parser and Fingerprints

Sprint: 01 - Feed Engine Core

## Objective

Parse RSS and Atom documents into Srotiva's normalized feed item format with stable item fingerprints for exact deduplication.

## Exact Scope

- Parse RSS 2.0 and Atom 1.0 XML.
- Normalize feed metadata and item fields.
- Generate stable item fingerprints.
- Preserve selected raw source fields for diagnostics.
- Do not render RSS/JSON/CSV endpoints or persist items in this ticket.

## Files/modules to create or modify

- Modify `package.json`
- Create `src/lib/feed/native-parser.mjs`
- Create `src/lib/feed/fingerprint.mjs`
- Create `src/test/native-parser.test.mjs`
- Create `src/test/fingerprint.test.mjs`
- Create `src/test/fixtures/rss-basic.xml`
- Create `src/test/fixtures/atom-basic.xml`
- Create `src/test/fixtures/rss-missing-guid.xml`

## Database changes

None.

## API changes

None.

## Frontend changes

None.

## Backend changes

- Add an XML parser dependency such as `fast-xml-parser`.
- Export `parseNativeFeed({ url, bodyText, contentType })`.
- Return:
  - `feedTitle`
  - `feedDescription`
  - `siteUrl`
  - `items`
- Each item must include:
  - `sourceItemId`
  - `fingerprint`
  - `canonicalUrl`
  - `url`
  - `title`
  - `descriptionText`
  - `descriptionHtml`
  - `author`
  - `imageUrl`
  - `datePublished`
  - `dateModified`
  - `raw`
- Fingerprint priority:
  - canonical URL + feed URL
  - GUID/id + feed URL
  - normalized title + date + feed URL

## Tests required

- Parses RSS channel title and item title/link/date.
- Parses Atom feed title and entry link/date.
- Extracts media/enclosure image URL when present.
- Generates same fingerprint for the same canonical URL.
- Generates different fingerprints for different feeds with the same item URL.
- Falls back to title/date when GUID and link are missing.
- Rejects non-feed XML with `INVALID_FEED`.

## Acceptance criteria

- RSS and Atom fixtures produce normalized item arrays.
- Fingerprints are deterministic across test runs.
- Parser does not fetch URLs itself.
- `bun run test` passes.
- `bun run check` passes.

## Dependencies

- `S00-T01-runtime-config-and-errors.md`

