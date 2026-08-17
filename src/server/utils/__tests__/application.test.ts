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
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const response = await fetch(`${baseUrl}/api/data/test`);

  assert.strictEqual(response.status, 200);
  assert.match(
    response.headers.get("content-type") || "",
    /^application\/json/,
  );
  assert.deepStrictEqual(
    Object.keys((await response.json()) as Record<string, unknown>).sort(),
    ["message", "timestamp"],
  );

  const componentModule = await fetch(`${baseUrl}/components/index.mjs`);
  assert.strictEqual(componentModule.status, 200);
  assert.match(
    componentModule.headers.get("content-type") || "",
    /^application\/javascript/,
  );

  const componentStyles = await fetch(`${baseUrl}/components/index.css`);
  assert.strictEqual(componentStyles.status, 200);
  assert.match(
    componentStyles.headers.get("content-type") || "",
    /^text\/css/,
  );

  const home = await fetch(baseUrl);
  assert.strictEqual(home.status, 200);
  assert.match(await home.text(), /<lp-layout variant="landing">/);

  const pollCreate = await fetch(`${baseUrl}/poll/create`);
  assert.strictEqual(pollCreate.status, 200);
  const pollCreateHtml = await pollCreate.text();
  assert.match(pollCreateHtml, /<lp-sidebar variant="public" >/);
  assert.match(pollCreateHtml, /aria-label="Collapse sidebar"/);

  const collapsedPollCreate = await fetch(`${baseUrl}/poll/create`, {
    headers: { cookie: "localpoll_sidebar=collapsed" },
  });
  const collapsedPollCreateHtml = await collapsedPollCreate.text();
  assert.match(collapsedPollCreateHtml, /<lp-sidebar variant="public" collapsed>/);
  assert.match(collapsedPollCreateHtml, /aria-label="Expand sidebar"/);

  const configuration = await fetch(
    `${baseUrl}/poll/create/configuration?question=${encodeURIComponent("<script>alert(1)</script>")}`,
  );
  const configurationHtml = await configuration.text();
  assert.strictEqual(configuration.status, 200);
  assert.match(
    configurationHtml,
    /&lt;script&gt;alert\(1\)&lt;\/script&gt;/,
  );
  assert.doesNotMatch(configurationHtml, /<script>alert\(1\)<\/script>/);
});
