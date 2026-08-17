import assert from "node:assert";
import { test } from "node:test";
import {
  DEFAULT_BRANDING,
  MAX_LOGO_SIZE,
  buildThemeCss,
  getLogoUrl,
  isBrandingCustomized,
  validateBrandingSettings,
  validateLogo,
} from "../branding.ts";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test("branding settings are normalized before they are stored", () => {
  const result = validateBrandingSettings({
    brandName: "  Night   Shift Polls ",
    primaryColor: "#0055FF",
    fontColor: " #101820 ",
    shadowColor: "#FF00AA",
  });

  assert.deepStrictEqual(result.errors, []);
  assert.deepStrictEqual(result.values, {
    brandName: "Night Shift Polls",
    primaryColor: "#0055ff",
    fontColor: "#101820",
    shadowColor: "#ff00aa",
  });
});

test("a blank or labelled shadow color means it follows the font color", () => {
  const blank = validateBrandingSettings({
    brandName: "Polls",
    primaryColor: "#0055ff",
    fontColor: "#101820",
    shadowColor: "   ",
  });
  const labelled = validateBrandingSettings({
    brandName: "Polls",
    primaryColor: "#0055ff",
    fontColor: "#101820",
    shadowColor: "Inherit Font Color",
  });

  assert.strictEqual(blank.values?.shadowColor, null);
  assert.strictEqual(labelled.values?.shadowColor, null);
});

test("an empty brand name and malformed colors are rejected", () => {
  const result = validateBrandingSettings({
    brandName: "   ",
    primaryColor: "rgb(1, 2, 3)",
    fontColor: "#12345",
    shadowColor: "not-a-color",
  });

  assert.strictEqual(result.values, undefined);
  assert.strictEqual(result.errors.length, 4);
  assert.match(result.errors[0], /Enter a brand name/);
});

test("brand names longer than the column allowance are rejected", () => {
  const result = validateBrandingSettings({
    brandName: "a".repeat(61),
    primaryColor: "#0055ff",
    fontColor: "#101820",
    shadowColor: "",
  });

  assert.strictEqual(result.values, undefined);
  assert.match(result.errors[0], /under 61 characters/);
});

test("logo uploads are accepted on their bytes, not their file name", () => {
  const png = validateLogo({
    filename: "mark.txt",
    data: Buffer.concat([PNG_HEADER, Buffer.alloc(16)]),
  });
  const disguised = validateLogo({
    filename: "mark.png",
    data: Buffer.from("<svg onload=\"alert(1)\"></svg>"),
  });

  assert.strictEqual(png.values?.mimeType, "image/png");
  assert.strictEqual(disguised.values, undefined);
  assert.match(disguised.errors[0], /PNG, JPG, or WebP/);
});

test("oversized logos are rejected before they reach the database", () => {
  const result = validateLogo({
    filename: "mark.png",
    data: Buffer.concat([PNG_HEADER, Buffer.alloc(MAX_LOGO_SIZE)]),
  });

  assert.strictEqual(result.values, undefined);
  assert.match(result.errors[0], /smaller than 512KB/);
});

test("the theme stylesheet repoints the color tokens", () => {
  const css = buildThemeCss({
    ...DEFAULT_BRANDING,
    brandName: "Night Shift Polls",
    primaryColor: "#0055ff",
    fontColor: "#101820",
    shadowColor: "#ff00aa",
  });

  assert.match(css, /--lp-color-primary: #0055ff;/);
  assert.match(css, /--lp-color-ink: #101820;/);
  assert.match(css, /--lp-shadow-raised: 5px 5px 0 #ff00aa;/);
  assert.match(css, /--lp-focus-ring: 0 0 0 4px rgb\(0 85 255 \/ 45%\);/);
});

test("an inherited shadow color falls back to the font color", () => {
  const css = buildThemeCss({
    ...DEFAULT_BRANDING,
    fontColor: "#101820",
    shadowColor: null,
  });

  assert.match(css, /--lp-shadow-raised: 5px 5px 0 #101820;/);
});

test("branding counts as customized once it differs from the bundled identity", () => {
  assert.strictEqual(isBrandingCustomized(DEFAULT_BRANDING), false);
  // Saving the defaults back is not a rebrand.
  assert.strictEqual(
    isBrandingCustomized({ ...DEFAULT_BRANDING, updatedAt: 1234 }),
    false,
  );

  for (const change of [
    { brandName: "Night Shift Polls" },
    { primaryColor: "#0055ff" },
    { fontColor: "#101820" },
    { shadowColor: "#ff00aa" },
    { logoMimeType: "image/png" },
  ]) {
    assert.strictEqual(
      isBrandingCustomized({ ...DEFAULT_BRANDING, ...change }),
      true,
      `${Object.keys(change)[0]} should count as a rebrand`,
    );
  }
});

test("the logo URL only leaves the bundled default once one is uploaded", () => {
  assert.strictEqual(getLogoUrl(DEFAULT_BRANDING), "/logo.png");
  assert.strictEqual(
    getLogoUrl({
      ...DEFAULT_BRANDING,
      logoMimeType: "image/png",
      updatedAt: 1234,
    }),
    "/branding/logo?v=1234",
  );
});
