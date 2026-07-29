import assert from "node:assert";
import { test } from "node:test";
import { Database } from "../db.ts";
import { isCustomizationEnabled } from "../customization.ts";
import { validatePassword } from "../password.ts";

test("customization is enabled only by a true value", () => {
  assert.strictEqual(
    isCustomizationEnabled({ LOCAL_POLL_ENABLE_CUSTOMIZATION: "true" }),
    true,
  );
  assert.strictEqual(
    isCustomizationEnabled({ LOCAL_POLL_ENABLE_CUSTOMIZATION: " TRUE " }),
    true,
  );
  assert.strictEqual(
    isCustomizationEnabled({ LOCAL_POLL_ENABLE_CUSTOMIZATION: "false" }),
    false,
  );
  assert.strictEqual(isCustomizationEnabled({}), false);
});

test("users table is created only when customization is enabled", () => {
  const standardDatabase = Database.create(":memory:");
  standardDatabase.setupTables(false);
  assert.strictEqual(
    standardDatabase.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
      )
      .get(),
    undefined,
  );
  standardDatabase.db.close();

  const customizedDatabase = Database.create(":memory:");
  customizedDatabase.setupTables(true);
  assert.ok(
    customizedDatabase.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
      )
      .get(),
  );
  customizedDatabase.db.close();
});

test("admin passwords require 11 characters and a special character", () => {
  assert.strictEqual(validatePassword("abcdefghij!").valid, true);
  assert.deepStrictEqual(validatePassword("abcdefghij1").errors, [
    "Password must include at least one special character.",
  ]);
  assert.deepStrictEqual(validatePassword("abcdefghi!").errors, [
    "Password must be at least 11 characters.",
  ]);
});
