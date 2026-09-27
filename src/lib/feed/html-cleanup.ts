import * as cheerio from "cheerio";

export function cleanHtmlText(value: string | null): string | null {
  if (!value) return null;

  const $ = cheerio.load(value, null, false);
  $("script, style, noscript, template").remove();
  return $.root().text().replace(/\s+/g, " ").trim() || null;
}
