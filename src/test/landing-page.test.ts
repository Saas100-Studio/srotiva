import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("restored landing retains SEO and routes into the real feed workflow", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const landing = await readFile(new URL("../components/landing-page.tsx", import.meta.url), "utf8");
  assert.match(page, /createPublicPageMetadata/);
  assert.match(page, /application\/ld\+json/);
  assert.match(page, /<LandingPage \/>/);
  assert.match(landing, /Small bites from the live web\./);
  for (const href of ["/login", "/signup", "/dashboard/feeds/new", "/help", "/contact"]) {
    assert.ok(landing.includes(`href="${href}"`));
  }
  // The old console was a simulated builder: keep its visual sample explicit.
  assert.match(landing, /aria-label="Example feed preview"/);
  assert.match(landing, /Sample articles/);
  assert.doesNotMatch(landing, /Visual Builder|Newsletter to RSS|Webhooks|OPML|Widgets powered|4\.7|400,000/);
  const anchors = [...landing.matchAll(/href="#([^"]+)"/gu)].map((match) => match[1]);
  for (const anchor of anchors) assert.ok(landing.includes(`id="${anchor}"`));
});
