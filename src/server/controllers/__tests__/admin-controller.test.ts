import assert from "node:assert";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { AdminController } from "../admin-controller.ts";
import { Application } from "../../utils/application.ts";
import { Database } from "../../utils/db.ts";

test("first-time setup gates the instance and establishes an admin session", async (context) => {
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DATABASE_PATH = ":memory:";
  process.env.LOCAL_POLL_ENABLE_CUSTOMIZATION = "true";

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
  const request = (path: string, init: RequestInit = {}) =>
    fetch(`${origin}${path}`, { redirect: "manual", ...init });

  const gatedHome = await request("/");
  assert.strictEqual(gatedHome.status, 303);
  assert.strictEqual(gatedHome.headers.get("location"), "/admin/setup");

  const gatedApi = await request("/api/data/test");
  assert.strictEqual(gatedApi.status, 303);
  assert.strictEqual(gatedApi.headers.get("location"), "/admin/setup");

  const setupPage = await request("/admin/setup");
  assert.strictEqual(setupPage.status, 200);
  assert.match(await setupPage.text(), /First-time\s*<br \/>setup/);

  const invalidSetup = await request("/admin/setup", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      email: "admin@example.com",
      password: "short!",
    }),
  });
  assert.strictEqual(invalidSetup.status, 422);
  assert.match(await invalidSetup.text(), /at least 11 characters/);

  const completedSetup = await request("/admin/setup", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      email: "ADMIN@example.com",
      password: "abcdefghij!",
    }),
  });
  assert.strictEqual(completedSetup.status, 303);
  assert.strictEqual(completedSetup.headers.get("location"), "/admin");
  const setupCookie = completedSetup.headers.get("set-cookie");
  assert.match(setupCookie || "", /localpoll_admin_session=/);

  const storedAdmin = Database.getInstance().db
    .prepare("SELECT email, password_hash FROM users WHERE role = 'admin'")
    .get() as { email: string; password_hash: string };
  assert.strictEqual(storedAdmin.email, "admin@example.com");
  assert.notStrictEqual(storedAdmin.password_hash, "abcdefghij!");

  const retiredSetupRoute = await request("/admin/setup");
  assert.strictEqual(retiredSetupRoute.status, 303);
  assert.strictEqual(retiredSetupRoute.headers.get("location"), "/admin");

  const anonymousAdmin = await request("/admin");
  assert.strictEqual(anonymousAdmin.status, 303);
  assert.strictEqual(anonymousAdmin.headers.get("location"), "/admin/login");

  const badLogin = await request("/admin/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      email: "admin@example.com",
      password: "wrong-password!",
    }),
  });
  assert.strictEqual(badLogin.status, 401);
  assert.match(await badLogin.text(), /email or password is incorrect/);

  const login = await request("/admin/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      email: "admin@example.com",
      password: "abcdefghij!",
    }),
  });
  assert.strictEqual(login.status, 303);
  assert.strictEqual(login.headers.get("location"), "/admin");
  const loginCookie = login.headers.get("set-cookie");
  assert.match(loginCookie || "", /localpoll_admin_session=/);

  const adminPage = await request("/admin", {
    headers: { cookie: loginCookie || "" },
  });
  assert.strictEqual(adminPage.status, 200);
  const adminHtml = await adminPage.text();
  assert.match(adminHtml, /class="admin-sidebar"/);
  assert.match(adminHtml, /class="admin-content"/);
  assert.match(adminHtml, />admin@example\.com</);

  const logout = await request("/admin/logout", {
    method: "POST",
    headers: { cookie: loginCookie || "" },
  });
  assert.strictEqual(logout.status, 303);
  assert.strictEqual(logout.headers.get("location"), "/admin/login");
  assert.match(logout.headers.get("set-cookie") || "", /Max-Age=0/);

  const expiredSession = await request("/admin", {
    headers: { cookie: loginCookie || "" },
  });
  assert.strictEqual(expiredSession.status, 303);
  assert.strictEqual(expiredSession.headers.get("location"), "/admin/login");
});
