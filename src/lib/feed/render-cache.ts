export function getRenderCacheControl(access: "public" | "private"): string {
  return access === "public"
    ? "public, max-age=60, stale-while-revalidate=300"
    : "private, no-store";
}
