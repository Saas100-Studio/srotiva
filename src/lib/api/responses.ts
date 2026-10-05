import { randomUUID } from "node:crypto";

import { SrotivaApiError } from "./errors.ts";

type ResponseInitWithRequestId = ResponseInit & { requestId?: string };

export function createRequestId(): string {
  return randomUUID();
}

function responseInit(
  init: ResponseInitWithRequestId,
  defaultStatus: number,
) {
  const { requestId = createRequestId(), headers, ...rest } = init;
  const responseHeaders = new Headers(headers);
  responseHeaders.set("x-request-id", requestId);

  return {
    requestId,
    init: {
      status: defaultStatus,
      ...rest,
      headers: responseHeaders,
    } satisfies ResponseInit,
  };
}

export function jsonOk(data: unknown, init: ResponseInitWithRequestId = {}) {
  const response = responseInit(init, 200);

  return Response.json(
    {
      data,
      requestId: response.requestId,
    },
    response.init,
  );
}

export function jsonError(
  error: unknown,
  init: ResponseInitWithRequestId = {},
) {
  const apiError =
    error instanceof SrotivaApiError
      ? error
      : new SrotivaApiError(
          500,
          "INTERNAL_ERROR",
          "An unexpected error occurred.",
        );
  const response = responseInit(
    {
      ...init,
      status: apiError.status,
      headers: apiError.code === "RATE_LIMITED"
        ? new Headers({
            ...Object.fromEntries(new Headers(init.headers)),
            "retry-after": String(apiError.details.retryAfterSeconds ?? 1),
          })
        : init.headers,
    },
    apiError.status,
  );

  return Response.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
      },
      requestId: response.requestId,
    },
    response.init,
  );
}
