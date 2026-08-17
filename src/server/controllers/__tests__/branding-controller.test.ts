import assert from "node:assert";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { AdminController } from "../admin-controller.ts";
import { BrandingController } from "../branding-controller.ts";
import { Application } from "../../utils/application.ts";

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("localpoll-test-logo"),
]);

test("an admin can rebrand the instance name, palette, and logo", async (context) => {
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DATABASE_PATH = ":memory:";
  process.env.LOCAL_POLL_ENABLE_CUSTOMIZATION = "true";

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
  const request = (path: string, init: RequestInit = {}) =>
    fetch(`${origin}${path}`, { redirect: "manual", ...init });

  const setup = await request("/admin/setup", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      email: "admin@example.com",
      password: "abcdefghij!",
    }),
  });
  const cookie = setup.headers.get("set-cookie") || "";

  const unbrandedSidebar = await (await request("/poll")).text();
  assert.match(unbrandedSidebar, /class="sidebar-source" >/);
  assert.match(unbrandedSidebar, /class="sidebar-attribution"\s+hidden\s*>/);

  const defaults = await request("/admin/branding", { headers: { cookie } });
  const defaultsHtml = await defaults.text();
  assert.strictEqual(defaults.status, 200);
  assert.match(defaultsHtml, /name="brandName"\s+value="LocalPoll"/);
  assert.match(defaultsHtml, /value="#fcc435"/);
  assert.match(defaultsHtml, /data-file-preview src="\/logo\.png"/);
  assert.match(defaultsHtml, /value="Inherit Font Color"/);

  // Every field, and every section, carries the defaults its reset restores.
  assert.match(defaultsHtml, /<lp-reset-button targets="brand-name" hidden>/);
  assert.match(
    defaultsHtml,
    /targets="primary-color-hex font-color-hex shadow-color-hex"/,
  );
  assert.match(
    defaultsHtml,
    /<lp-reset-button targets="branding-logo-picker" hidden>/,
  );
  assert.match(defaultsHtml, /data-default-value="LocalPoll"/);
  assert.match(defaultsHtml, /data-default-value="#fcc435"/);
  assert.match(defaultsHtml, /data-default-value="#121e37"/);
  assert.match(defaultsHtml, /data-default-value="Inherit Font Color"/);
  assert.match(defaultsHtml, /default-preview="\/logo\.png"/);
  assert.match(
    defaultsHtml,
    /<input type="hidden" name="removeLogo" value="" data-file-cleared \/>/,
  );
  // Two section resets, one per field, plus the logo.
  assert.strictEqual(
    defaultsHtml.match(/title="Reset value to default"/g)?.length,
    7,
  );
  // Nothing has moved off its default yet, so no reset is offered.
  assert.strictEqual(defaultsHtml.match(/<lp-reset-button[^>]*hidden/g)?.length, 7);

  const form = new FormData();
  form.set("brandName", "Night Shift Polls");
  form.set("primaryColor", "#0055ff");
  form.set("primaryColorHex", "#0055ff");
  form.set("fontColor", "#101820");
  form.set("fontColorHex", "#101820");
  form.set("shadowColor", "#ff00aa");
  form.set("shadowColorHex", "#ff00aa");
  form.set("logo", new Blob([PNG], { type: "image/png" }), "mark.png");

  const saved = await request("/admin/branding", {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  assert.strictEqual(saved.status, 303);
  assert.strictEqual(
    saved.headers.get("location"),
    "/admin/branding?saved=1",
  );

  const reloaded = await request("/admin/branding?saved=1", {
    headers: { cookie },
  });
  const reloadedHtml = await reloaded.text();
  assert.match(reloadedHtml, /name="brandName"\s+value="Night Shift Polls"/);
  assert.match(reloadedHtml, /value="#0055ff"/);
  assert.match(reloadedHtml, /value="#ff00aa"/);
  assert.match(reloadedHtml, /data-file-preview src="\/branding\/logo\?v=\d+"/);
  assert.match(reloadedHtml, /Branding saved\./);
  // Every value moved, so every reset is on offer.
  assert.strictEqual(reloadedHtml.match(/<lp-reset-button[^>]*hidden/g), null);

  const theme = await request("/branding/theme");
  const themeCss = await theme.text();
  assert.strictEqual(theme.status, 200);
  assert.match(theme.headers.get("content-type") || "", /text\/css/);
  assert.match(themeCss, /--lp-color-primary: #0055ff;/);
  assert.match(themeCss, /--lp-color-ink: #101820;/);
  assert.match(themeCss, /--lp-shadow-raised: 5px 5px 0 #ff00aa;/);

  const logo = await request("/branding/logo");
  assert.strictEqual(logo.status, 200);
  assert.strictEqual(logo.headers.get("content-type"), "image/png");
  assert.ok(Buffer.from(await logo.arrayBuffer()).equals(PNG));

  const publicPage = await request("/poll");
  const publicHtml = await publicPage.text();
  assert.match(publicHtml, /<title>Night Shift Polls<\/title>/);
  assert.match(publicHtml, /Night Shift Polls keeps things direct/);
  assert.match(publicHtml, /<link rel="stylesheet" href="\/branding\/theme\?v=\d+" \/>/);
  // The source link steps aside for an attribution once the instance is branded.
  assert.match(publicHtml, /class="sidebar-source" hidden>/);
  assert.match(publicHtml, /class="sidebar-attribution"\s+>/);
  assert.match(publicHtml, /<span>Built with LocalPoll<\/span>/);
  assert.match(
    publicHtml,
    /class="built-with"\s+href="https:\/\/github\.com\/spinualexandru\/local-poll"/,
  );

  const rejected = await request("/admin/branding", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    body: new URLSearchParams({
      brandName: "   ",
      primaryColorHex: "not-a-color",
      fontColorHex: "#101820",
      shadowColorHex: "",
    }),
  });
  const rejectedHtml = await rejected.text();
  assert.strictEqual(rejected.status, 422);
  assert.match(rejectedHtml, /Enter a brand name\./);
  assert.match(rejectedHtml, /primary color as a hex value/);

  const unchanged = await request("/branding/theme");
  assert.match(await unchanged.text(), /--lp-color-primary: #0055ff;/);

  const restored = new FormData();
  restored.set("brandName", "Night Shift Polls");
  restored.set("primaryColorHex", "#0055ff");
  restored.set("fontColorHex", "#101820");
  restored.set("shadowColorHex", "Inherit Font Color");
  restored.set("removeLogo", "1");

  const removedLogo = await request("/admin/branding", {
    method: "POST",
    headers: { cookie },
    body: restored,
  });
  assert.strictEqual(removedLogo.status, 303);

  const afterRemoval = await request("/admin/branding", { headers: { cookie } });
  const afterRemovalHtml = await afterRemoval.text();
  assert.match(afterRemovalHtml, /data-file-preview src="\/logo\.png"/);
  // Only the values still off their defaults keep a reset: name and two colors.
  assert.match(afterRemovalHtml, /targets="branding-logo-picker" hidden>/);
  assert.match(afterRemovalHtml, /targets="shadow-color-hex" hidden>/);
  assert.match(afterRemovalHtml, /targets="brand-name" >/);
  assert.match(afterRemovalHtml, /targets="primary-color-hex" >/);
  assert.match(afterRemovalHtml, /targets="font-color-hex" >/);
  assert.strictEqual((await request("/branding/logo")).status, 404);
  assert.match(
    await (await request("/branding/theme")).text(),
    /--lp-shadow-raised: 5px 5px 0 #101820;/,
  );

  const anonymous = await request("/admin/branding", {
    method: "POST",
    body: new URLSearchParams({ brandName: "Hijacked" }),
  });
  assert.strictEqual(anonymous.status, 303);
  assert.strictEqual(anonymous.headers.get("location"), "/admin/login");
  assert.match(
    await (await request("/branding/theme")).text(),
    /--lp-color-primary: #0055ff;/,
  );
});
