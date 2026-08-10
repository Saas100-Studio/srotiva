import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "../lib/auth/password.ts";

test("hashes passwords with Argon2id and verifies only the valid password", async () => {
  const password = "a-production-worthy-password";
  const passwordHash = await hashPassword(password);

  assert.notEqual(passwordHash, password);
  assert.match(passwordHash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(passwordHash, password), true);
  assert.equal(await verifyPassword(passwordHash, "wrong-password"), false);
  assert.equal(await verifyPassword("not-a-valid-hash", password), false);
});
