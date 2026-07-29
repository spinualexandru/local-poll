import assert from "node:assert";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { TestController } from "../../controllers/test-controller.ts";
import { Application } from "../application.ts";

test("Application serves requests over regular HTTP", async (context) => {
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DATABASE_PATH = ":memory:";

  const application = Application.getInstance();
  application.registerController(new TestController());

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
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/data/test`,
  );

  assert.strictEqual(response.status, 200);
  assert.match(
    response.headers.get("content-type") || "",
    /^application\/json/,
  );
  assert.deepStrictEqual(
    Object.keys((await response.json()) as Record<string, unknown>).sort(),
    ["message", "timestamp"],
  );
});
