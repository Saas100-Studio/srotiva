import { loadLimits } from "./limits.ts";
import { loadAppUrl } from "./app-url.ts";

type EnvOverrides = Record<string, string | undefined>;

const MIN_SESSION_SECRET_LENGTH = 32;

function requiredString(overrides: EnvOverrides, name: string): string {
  const value = overrides[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function loadEnv(overrides: EnvOverrides = process.env) {
  const SESSION_SECRET = requiredString(overrides, "SESSION_SECRET");

  if (SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters.`,
    );
  }

  return {
    APP_URL: loadAppUrl(overrides),
    DATABASE_URL: requiredString(overrides, "DATABASE_URL"),
    SESSION_SECRET,
    CRAWLER_USER_AGENT: requiredString(overrides, "CRAWLER_USER_AGENT"),
    ...loadLimits(overrides),
  };
}
