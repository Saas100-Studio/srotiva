import { SrotivaApiError } from "../api/errors.ts";

export type LogEvent = {
  event: string;
  requestId: string;
  errorCode: string;
  route: string;
  feedId?: string;
  workspaceId?: string;
};

export function logError(error: unknown, event: Omit<LogEvent, "errorCode">, write: (line: string) => void = console.error): void {
  write(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    ...event,
    errorCode: error instanceof SrotivaApiError ? error.code : "INTERNAL_ERROR",
  }));
}
