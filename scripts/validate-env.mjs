import { pathToFileURL } from "node:url";

import { loadEnv } from "../src/lib/config/env.ts";

/** @param {Record<string, string | undefined>} environment */
export function validateEnvironment(environment = process.env) {
  return loadEnv(environment);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    validateEnvironment();
    console.log("Environment is valid: APP_URL, DATABASE_URL, SESSION_SECRET, crawler, fetch, and refresh settings are configured.");
  } catch (error) {
    console.error(`Environment validation failed: ${error instanceof Error ? error.message : "Invalid configuration."}`);
    process.exitCode = 1;
  }
}
