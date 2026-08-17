import assert from "node:assert";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { AdminController } from "../admin-controller.ts";
import { BrandingController } from "../branding-controller.ts";
import { Application } from "../../utils/application.ts";
import { Database } from "../../utils/db.ts";

test("admin routes and users table stay unavailable when customization is disabled", async (context) => {
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DATABASE_PATH = ":memory:";
  process.env.LOCAL_POLL_ENABLE_CUSTOMIZATION = "false";

  const application = Application.getInstance();
  application.registerController(new BrandingController());
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
  const homeHtml = await home.text();
  assert.strictEqual(home.status, 200);
  assert.match(homeHtml, /Zero Dependency self-hosted poll system/);
  assert.match(homeHtml, /<title>LocalPoll<\/title>/);
  assert.match(homeHtml, /<img src="\/logo\.png" alt="" width="54" \/>/);

  const publicPage = await fetch(`${origin}/poll`);
  const publicHtml = await publicPage.text();
  assert.match(publicHtml, /class="sidebar-source" >/);
  assert.match(publicHtml, /class="sidebar-attribution"\s+hidden\s*>/);

  const setup = await fetch(`${origin}/admin/setup`, { redirect: "manual" });
  assert.strictEqual(setup.status, 404);

  const branding = await fetch(`${origin}/admin/branding`, {
    redirect: "manual",
  });
  assert.strictEqual(branding.status, 404);

  const savedBranding = await fetch(`${origin}/admin/branding`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ brandName: "Hijacked" }),
  });
  assert.strictEqual(savedBranding.status, 404);

  // The layouts still link the theme, so it answers with an empty stylesheet.
  const theme = await fetch(`${origin}/branding/theme`);
  assert.strictEqual(theme.status, 200);
  assert.strictEqual(await theme.text(), "");
  assert.strictEqual((await fetch(`${origin}/branding/logo`)).status, 404);

  for (const table of ["users", "branding"]) {
    assert.strictEqual(
      Database.getInstance().db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        )
        .get(table),
      undefined,
    );
  }
});
