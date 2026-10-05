import assert from "node:assert/strict";
import test from "node:test";

import { SrotivaApiError } from "../lib/api/errors.ts";
import { readBoundedJsonBody } from "../lib/api/json-body.ts";

test("bounded JSON reader parses chunked UTF-8 without trusting content-length", async () => {
  const encoder = new TextEncoder();
  const chunks = [encoder.encode('{"message":"caf'), encoder.encode('é"}')];
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    body: new ReadableStream({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
    }),
    duplex: "half",
  } as RequestInit);

  assert.deepEqual(await readBoundedJsonBody(request, { maxBytes: 64 }), { message: "café" });
});

test("bounded JSON reader rejects declared and streamed oversized bodies", async () => {
  const declared = new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-length": "100" },
    body: "{}",
  });
  await assert.rejects(
    readBoundedJsonBody(declared, { maxBytes: 10 }),
    (error: unknown) => error instanceof SrotivaApiError && error.status === 413 && error.code === "REQUEST_BODY_TOO_LARGE",
  );

  const streamed = new Request("http://localhost/api/test", {
    method: "POST",
    body: JSON.stringify({ value: "too long" }),
  });
  await assert.rejects(
    readBoundedJsonBody(streamed, { maxBytes: 8 }),
    (error: unknown) => error instanceof SrotivaApiError && error.status === 413,
  );
});

test("bounded JSON reader preserves route-specific invalid JSON errors", async () => {
  const request = new Request("http://localhost/api/test", { method: "POST", body: "{" });
  await assert.rejects(
    readBoundedJsonBody(request, {
      maxBytes: 64,
      invalidJsonError: () => new SrotivaApiError(422, "INVALID_URL", "A URL is required."),
    }),
    (error: unknown) => error instanceof SrotivaApiError && error.code === "INVALID_URL" && error.message === "A URL is required.",
  );
});
