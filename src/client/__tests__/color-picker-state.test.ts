import assert from "node:assert";
import { test } from "node:test";
import {
  normalizeHexColor,
  resolveColorPickerState,
} from "../public/components/molecules/color-picker-state.mjs";

test("normalizeHexColor accepts complete hex colors and normalizes case", () => {
  assert.strictEqual(normalizeHexColor(" #FCC435 "), "#fcc435");
  assert.strictEqual(normalizeHexColor("#121e37"), "#121e37");
});

test("normalizeHexColor rejects shorthand and malformed values", () => {
  assert.strictEqual(normalizeHexColor("#fff"), null);
  assert.strictEqual(normalizeHexColor("121e37"), null);
  assert.strictEqual(normalizeHexColor("#xyzxyz"), null);
});

test("resolveColorPickerState preserves a valid swatch for invalid text", () => {
  assert.deepStrictEqual(
    resolveColorPickerState({
      textValue: "not a color",
      swatchValue: "#FCC435",
    }),
    {
      inherited: false,
      invalid: true,
      value: "#fcc435",
    },
  );
});

test("resolveColorPickerState recognizes the inherited label", () => {
  assert.deepStrictEqual(
    resolveColorPickerState({
      textValue: "Inherit Font Color",
      swatchValue: "#121e37",
      inheritLabel: "Inherit Font Color",
    }),
    {
      inherited: true,
      invalid: false,
      value: "#121e37",
    },
  );
});
