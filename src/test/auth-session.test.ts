import assert from "node:assert/strict";
import test from "node:test";

import {
  clearSessionCookie,
  createSessionCookie,
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionTokenFromCookieHeader,
  verifySessionToken,
} from "../lib/auth/session.ts";

const secret = "test-session-secret-that-is-longer-than-thirty-two-characters";
const now = new Date("2026-08-10T08:00:00.000Z");

test("creates signed sessions and rejects tampered or expired tokens", () => {
  const token = createSessionToken("user-123", {
    secret,
    now,
    ttlSeconds: 60,
  });

  assert.deepEqual(verifySessionToken(token, { secret, now }), {
    version: 1,
    userId: "user-123",
    expiresAt: Math.floor(now.getTime() / 1_000) + 60,
  });
  assert.equal(
    verifySessionToken(`${token.slice(0, -1)}x`, { secret, now }),
    null,
  );
  assert.equal(
    verifySessionToken(token, {
      secret,
      now: new Date("2026-08-10T08:01:00.000Z"),
    }),
    null,
  );
});

test("sets production-safe session cookie attributes", () => {
  const cookie = createSessionCookie("user-123", {
    secret,
    now,
    ttlSeconds: 60,
    secure: true,
  });

  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(cookie, /; Path=\//);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; SameSite=Lax/);
  assert.match(cookie, /; Max-Age=60/);
  assert.match(cookie, /; Secure/);

  const token = sessionTokenFromCookieHeader(`theme=dark; ${cookie}`);
  assert.equal(verifySessionToken(token ?? "", { secret, now })?.userId, "user-123");
});

test("clears the session cookie with matching security attributes", () => {
  const cookie = clearSessionCookie({ secure: true });

  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=;`));
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
});
