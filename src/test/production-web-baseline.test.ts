import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import nextConfig, { securityHeaders } from "../../next.config.mjs";
import manifest from "../app/manifest.ts";
import robots from "../app/robots.ts";
import sitemap from "../app/sitemap.ts";
import { canonicalRedirectUrl, loadAppUrl } from "../lib/config/app-url.ts";
import { createPublicPageMetadata } from "../lib/seo/metadata.ts";

function pngDimensions(path: string): { width: number; height: number } {
  const value = readFileSync(path);
  assert.equal(value.subarray(1, 4).toString("ascii"), "PNG");
  return { width: value.readUInt32BE(16), height: value.readUInt32BE(20) };
}

test("APP_URL is a normalized safe origin and production requires HTTPS", () => {
  assert.equal(loadAppUrl({ APP_URL: "https://srotiva.example///" }), "https://srotiva.example");
  assert.throws(
    () => loadAppUrl({ APP_URL: "https://user:secret@srotiva.example" }),
    /must not include credentials/u,
  );
  assert.throws(
    () => loadAppUrl({ APP_URL: "https://srotiva.example/app" }),
    /must be an origin/u,
  );
  assert.throws(
    () => loadAppUrl({ APP_URL: "http://srotiva.example", NODE_ENV: "production" }),
    /must use https in production/u,
  );
  assert.equal(
    loadAppUrl({ APP_URL: "http://localhost:3000", NODE_ENV: "production" }),
    "http://localhost:3000",
  );
});

test("production canonical redirect preserves path and query", () => {
  const redirect = canonicalRedirectUrl(
    "http://www.srotiva.example/help?from=test",
    { APP_URL: "https://srotiva.example", NODE_ENV: "production" },
  );
  assert.equal(redirect?.href, "https://srotiva.example/help?from=test");
  assert.equal(
    canonicalRedirectUrl("https://srotiva.example/help", {
      APP_URL: "https://srotiva.example",
      NODE_ENV: "production",
    }),
    null,
  );
  assert.equal(
    canonicalRedirectUrl("http://preview.example/help", {
      APP_URL: "https://srotiva.example",
      NODE_ENV: "development",
    }),
    null,
  );
});

test("security headers cover browser hardening and HSTS is production-only", async () => {
  const production = new Map(securityHeaders("production").map(({ key, value }) => [key, value]));
  const development = new Map(securityHeaders("development").map(({ key, value }) => [key, value]));

  assert.match(production.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/u);
  assert.match(production.get("Content-Security-Policy") ?? "", /upgrade-insecure-requests/u);
  assert.equal(production.get("Strict-Transport-Security"), "max-age=31536000");
  assert.equal(production.get("X-Content-Type-Options"), "nosniff");
  assert.equal(production.get("X-Frame-Options"), "DENY");
  assert.equal(production.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(production.get("Permissions-Policy") ?? "", /camera=\(\)/u);
  assert.equal(development.has("Strict-Transport-Security"), false);
  assert.doesNotMatch(development.get("Content-Security-Policy") ?? "", /upgrade-insecure-requests/u);
  assert.equal(nextConfig.poweredByHeader, false);

  const configured = await nextConfig.headers?.();
  assert.ok(configured?.some(({ source }) => source === "/api/:path*"));
  assert.ok(configured?.some(({ source }) => source === "/f/:path*"));
});

test("robots and sitemap expose only deliberate public pages from APP_URL", () => {
  const oldAppUrl = process.env.APP_URL;
  process.env.APP_URL = "https://srotiva.example";
  try {
    const policy = robots();
    assert.equal(policy.host, "https://srotiva.example");
    assert.equal(policy.sitemap, "https://srotiva.example/sitemap.xml");
    assert.deepEqual(policy.rules, {
      userAgent: "*",
      allow: ["/", "/help/", "/contact"],
      disallow: ["/api/", "/dashboard/", "/f/", "/legal/", "/login", "/signup"],
    });

    const urls = sitemap().map(({ url }) => url);
    assert.deepEqual(urls, [
      "https://srotiva.example",
      "https://srotiva.example/help",
      "https://srotiva.example/help/create-a-feed",
      "https://srotiva.example/help/output-formats",
      "https://srotiva.example/help/refreshes-and-history",
      "https://srotiva.example/help/filters",
      "https://srotiva.example/help/private-feeds",
      "https://srotiva.example/help/accounts-and-limits",
      "https://srotiva.example/help/troubleshooting",
      "https://srotiva.example/help/crawler-behavior",
      "https://srotiva.example/contact",
    ]);
    assert.equal(urls.some((url) => /dashboard|login|signup|legal|\/f\//u.test(url)), false);
  } finally {
    if (oldAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = oldAppUrl;
  }
});

test("manifest references the authoritative Srotiva mark without overstating its size", () => {
  const value = manifest();
  assert.equal(value.name, "Srotiva");
  assert.deepEqual(value.icons, [
    { src: "/srotiva-mark.png", sizes: "40x40", type: "image/png" },
  ]);
});

test("brand image assets are compact and have their declared dimensions", () => {
  assert.deepEqual(pngDimensions("public/srotiva-mark.png"), { width: 40, height: 40 });
  assert.deepEqual(pngDimensions("src/app/icon.png"), { width: 40, height: 40 });
  assert.match(readFileSync("src/app/opengraph-image.tsx", "utf8"), /Turn websites into reliable feeds/u);

  const favicon = readFileSync("src/app/favicon.ico");
  assert.equal(favicon.readUInt16LE(0), 0);
  assert.equal(favicon.readUInt16LE(2), 1);
  assert.equal(favicon.readUInt16LE(4), 3);
});

test("public page metadata keeps canonical and social URLs route-specific", () => {
  const metadata = createPublicPageMetadata({
    title: "Output formats",
    description: "Choose a feed output format.",
    path: "/help/output-formats",
  });
  assert.deepEqual(metadata.alternates, { canonical: "/help/output-formats" });
  assert.equal(metadata.openGraph?.url, "/help/output-formats");
  assert.equal(metadata.openGraph?.title, "Output formats | Srotiva");
  assert.equal(metadata.openGraph?.siteName, "Srotiva");
  assert.deepEqual(metadata.openGraph?.images, [{
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    type: "image/png",
    alt: "Srotiva — turn websites into reliable feeds",
  }]);
  assert.ok(metadata.twitter && "card" in metadata.twitter);
  assert.equal(metadata.twitter.card, "summary_large_image");
  assert.deepEqual(metadata.twitter.images, [{
    url: "/opengraph-image",
    alt: "Srotiva — turn websites into reliable feeds",
  }]);
});
