import assert from "node:assert";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { AdminController } from "../admin-controller.ts";
import { Application } from "../../utils/application.ts";
import { Database } from "../../utils/db.ts";

test("admin routes and users table stay unavailable when customization is disabled", async (context) => {
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DATABASE_PATH = ":memory:";
  process.env.LOCAL_POLL_ENABLE_CUSTOMIZATION = "false";

  const application = Application.getInstance();
  application.registerController(new AdminController());

  const server = application.getServer();
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  );

  const address = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${address.port}`;

  const home = await fetch(origin);
  assert.strictEqual(home.status, 200);
  assert.match(await home.text(), /Zero Dependency self-hosted poll system/);

  const setup = await fetch(`${origin}/admin/setup`, { redirect: "manual" });
  assert.strictEqual(setup.status, 404);

  assert.strictEqual(
    Database.getInstance().db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
      )
      .get(),
    undefined,
  );
});
