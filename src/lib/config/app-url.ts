type EnvOverrides = Record<string, string | undefined>;

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function loadAppUrl(overrides: EnvOverrides = process.env): string {
  const value = overrides.APP_URL?.trim();
  if (!value) throw new Error("APP_URL is required.");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("APP_URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new Error("APP_URL must not include credentials.");
  }
  if (!/^\/+$/u.test(url.pathname) || url.search || url.hash) {
    throw new Error("APP_URL must be an origin without a path, query, or fragment.");
  }
  if (
    overrides.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !isLocalHostname(url.hostname)
  ) {
    throw new Error("APP_URL must use https in production.");
  }

  return url.origin;
}

export function canonicalRedirectUrl(
  requestUrl: string,
  overrides: EnvOverrides = process.env,
): URL | null {
  if (overrides.NODE_ENV !== "production") return null;

  const requested = new URL(requestUrl);
  const canonical = new URL(loadAppUrl(overrides));
  if (requested.origin === canonical.origin) return null;

  canonical.pathname = requested.pathname;
  canonical.search = requested.search;
  return canonical;
}
