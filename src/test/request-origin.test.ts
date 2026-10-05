import assert from "node:assert/strict";
import test from "node:test";

import { SrotivaApiError } from "../lib/api/errors.ts";
import { assertTrustedMutationOrigin } from "../lib/security/request-origin.ts";

const appUrl = "https://srotiva.example";

test("allows safe methods without an Origin header", () => {
  assert.doesNotThrow(() => assertTrustedMutationOrigin(
    new Request(`${appUrl}/api/me`),
    { appUrl, requireOrigin: true },
  ));
});

test("allows a same-origin mutation", () => {
  assert.doesNotThrow(() => assertTrustedMutationOrigin(
    new Request(`${appUrl}/api/feeds`, {
      method: "POST",
      headers: { origin: appUrl, "sec-fetch-site": "same-origin" },
    }),
    { appUrl, requireOrigin: true },
  ));
});

test("rejects cross-site, mismatched, malformed, and missing production origins", () => {
  const requests = [
    new Request(`${appUrl}/api/feeds`, {
      method: "POST",
      headers: { origin: appUrl, "sec-fetch-site": "cross-site" },
    }),
    new Request(`${appUrl}/api/feeds`, {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    }),
    new Request(`${appUrl}/api/feeds`, {
      method: "POST",
      headers: { origin: "not a URL" },
    }),
    new Request(`${appUrl}/api/feeds`, { method: "POST" }),
  ];

  for (const request of requests) {
    assert.throws(
      () => assertTrustedMutationOrigin(request, { appUrl, requireOrigin: true }),
      (error: unknown) => error instanceof SrotivaApiError &&
        error.status === 403 && error.code === "INVALID_REQUEST_ORIGIN",
    );
  }
});

test("permits missing Origin outside production for CLI and test callers", () => {
  assert.doesNotThrow(() => assertTrustedMutationOrigin(
    new Request(`${appUrl}/api/feeds`, { method: "POST" }),
    { appUrl, requireOrigin: false },
  ));
});
