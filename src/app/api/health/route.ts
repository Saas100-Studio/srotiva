import packageJson from "../../../../package.json" with { type: "json" };

import { getDb } from "../../../lib/db/client.ts";

const HEALTH_TIMEOUT_MS = 2_000;
const DATABASE_TIMEOUT_MS = 1_000;

let databaseCheckInFlight: Promise<unknown> | null = null;

function checkDatabase(): Promise<unknown> {
  return getDb().$transaction(
    (transaction) => transaction.$queryRaw`SELECT 1`,
    { maxWait: DATABASE_TIMEOUT_MS, timeout: DATABASE_TIMEOUT_MS },
  );
}

function coalescedDatabaseCheck(check: () => Promise<unknown>): Promise<unknown> {
  if (databaseCheckInFlight) return databaseCheckInFlight;

  const pending = Promise.resolve().then(check);
  const tracked = pending.finally(() => {
    if (databaseCheckInFlight === tracked) databaseCheckInFlight = null;
  });
  tracked.catch(() => undefined);
  databaseCheckInFlight = tracked;
  return tracked;
}

type HealthDependencies = {
  checkDatabase?: () => Promise<unknown>;
  timeoutMs?: number;
};

export async function handleHealthGet(
  dependencies: HealthDependencies = {},
): Promise<Response> {
  const runDatabaseCheck = dependencies.checkDatabase ?? checkDatabase;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      coalescedDatabaseCheck(runDatabaseCheck),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Database health check timed out.")), dependencies.timeoutMs ?? HEALTH_TIMEOUT_MS);
      }),
    ]);

    return Response.json({
      status: "ok",
      version: packageJson.version,
      database: "ok",
      refreshProcesses: "not_checked",
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({
      status: "unavailable",
      version: packageJson.version,
      database: "unavailable",
      refreshProcesses: "not_checked",
    }, { status: 503, headers: { "cache-control": "no-store" } });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function GET(): Promise<Response> {
  return handleHealthGet();
}
