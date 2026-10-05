import type { MetadataRoute } from "next";

import { loadAppUrl } from "../lib/config/app-url.ts";

export default function robots(): MetadataRoute.Robots {
  const appUrl = loadAppUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/help/", "/contact"],
      disallow: ["/api/", "/dashboard/", "/f/", "/legal/", "/login", "/signup"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
