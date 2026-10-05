import type { MetadataRoute } from "next";

import { loadAppUrl } from "../lib/config/app-url.ts";

const publicRoutes = [
  "",
  "/help",
  "/help/create-a-feed",
  "/help/output-formats",
  "/help/refreshes-and-history",
  "/help/filters",
  "/help/private-feeds",
  "/help/accounts-and-limits",
  "/help/troubleshooting",
  "/help/crawler-behavior",
  "/contact",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = loadAppUrl();
  return publicRoutes.map((path, index) => ({
    url: `${appUrl}${path}`,
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.6,
  }));
}
