import assert from "node:assert/strict";
import test from "node:test";

import { renderCsvFeed } from "../lib/feed/render-csv.ts";
import type { NativeFeedItem } from "../lib/feed/native-parser.ts";

function item(title: string): NativeFeedItem {
  return {
    sourceItemId: null,
    fingerprint: "fingerprint",
    canonicalUrl: null,
    url: null,
    title,
    descriptionText: null,
    descriptionHtml: null,
    author: null,
    imageUrl: null,
    datePublished: null,
    dateModified: null,
    raw: {},
  };
}

test("prefixes spreadsheet formulas, including formulas hidden by leading whitespace", () => {
  for (const title of ["=1+1", "+cmd", "-2+3", "@SUM(A1:A2)", "\t=1+1", "\r+cmd", "\n@sum"]) {
    const row = renderCsvFeed({ items: [item(title)] }).split("\r\n").slice(1).join("\r\n");
    assert.ok(row.includes(`'${title}`), title);
  }
});

test("quotes commas, quotes, and line breaks using CSV escaping", () => {
  const output = renderCsvFeed({ items: [item('one, "two"\nthree')] });
  assert.match(output, /"one, ""two""\nthree"/);
});
