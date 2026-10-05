import assert from "node:assert/strict";
import test from "node:test";

import { SrotivaApiError } from "../lib/api/errors.ts";
import {
  createRequestId,
  jsonError,
  jsonOk,
} from "../lib/api/responses.ts";

test("creates UUID request IDs", () => {
  assert.match(
    createRequestId(),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("serializes SrotivaApiError to the shared error envelope", async () => {
  const response = jsonError(
    new SrotivaApiError(422, "INVALID_URL", "The URL is invalid.", {
      field: "url",
    }),
    { requestId: "request-123" },
  );

  assert.equal(response.status, 422);
  assert.equal(response.headers.get("x-request-id"), "request-123");
  assert.deepEqual(await response.json(), {
    error: {
      code: "INVALID_URL",
      message: "The URL is invalid.",
      details: { field: "url" },
    },
    requestId: "request-123",
  });
});

test("does not let response init override the API error status", () => {
  const response = jsonError(
    new SrotivaApiError(422, "INVALID_URL", "The URL is invalid."),
    { status: 200, requestId: "request-override" },
  );

  assert.equal(response.status, 422);
});

test("serializes unexpected errors without leaking internal details", async () => {
  const error = new Error("database password leaked");
  error.stack = "private stack trace";
  const response = jsonError(error, { requestId: "request-456" });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.deepEqual(body, {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      details: {},
    },
    requestId: "request-456",
  });
  assert.doesNotMatch(JSON.stringify(body), /database password|stack trace/);
});

test("serializes successful data to the shared success envelope", async () => {
  const response = jsonOk({ feedId: "feed-123" }, { requestId: "request-789" });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { feedId: "feed-123" },
    requestId: "request-789",
  });
});
