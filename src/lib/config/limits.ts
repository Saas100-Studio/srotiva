type EnvOverrides = Record<string, string | undefined>;

export const DEFAULT_FETCH_MAX_REDIRECTS = 5;
export const ROBOTS_CACHE_TTL_MS = 10 * 60 * 1_000;
export const DEFAULT_REQUEST_JSON_MAX_BYTES = 262_144;
export const DEFAULT_WORKSPACE_FEED_LIMIT = 25;
export const DEFAULT_WORKSPACE_ITEM_LIMIT = 10_000;
export const DEFAULT_WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT = 1_000;

function positiveInteger(value: string | undefined, name: string): number {
  const normalized = typeof value === "string" ? value.trim() : value;
  const number = Number(normalized);

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return number;
}

export function loadFetchLimits(overrides: EnvOverrides = process.env) {
  return {
    FETCH_TIMEOUT_MS: positiveInteger(
      overrides.FETCH_TIMEOUT_MS,
      "FETCH_TIMEOUT_MS",
    ),
    FETCH_MAX_BYTES: positiveInteger(
      overrides.FETCH_MAX_BYTES,
      "FETCH_MAX_BYTES",
    ),
  };
}

export function loadLimits(overrides: EnvOverrides = process.env) {
  return {
    ...loadFetchLimits(overrides),
    MANUAL_REFRESH_COOLDOWN_SECONDS: positiveInteger(
      overrides.MANUAL_REFRESH_COOLDOWN_SECONDS,
      "MANUAL_REFRESH_COOLDOWN_SECONDS",
    ),
    REQUEST_JSON_MAX_BYTES: positiveInteger(
      overrides.REQUEST_JSON_MAX_BYTES ?? String(DEFAULT_REQUEST_JSON_MAX_BYTES),
      "REQUEST_JSON_MAX_BYTES",
    ),
    WORKSPACE_FEED_LIMIT: positiveInteger(
      overrides.WORKSPACE_FEED_LIMIT ?? String(DEFAULT_WORKSPACE_FEED_LIMIT),
      "WORKSPACE_FEED_LIMIT",
    ),
    WORKSPACE_ITEM_LIMIT: positiveInteger(
      overrides.WORKSPACE_ITEM_LIMIT ?? String(DEFAULT_WORKSPACE_ITEM_LIMIT),
      "WORKSPACE_ITEM_LIMIT",
    ),
    WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT: positiveInteger(
      overrides.WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT ?? String(DEFAULT_WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT),
      "WORKSPACE_MONTHLY_MANUAL_REFRESH_LIMIT",
    ),
  };
}
