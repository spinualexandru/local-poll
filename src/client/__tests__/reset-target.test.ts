import assert from "node:assert";
import { test } from "node:test";
import {
  applyResetToTarget,
  areTargetsAtDefault,
  isTargetAtDefault,
  parseTargetIds,
} from "../public/components/atoms/reset-target.mjs";

test("parseTargetIds reads a whitespace separated list of ids", () => {
  assert.deepStrictEqual(parseTargetIds("brand-name"), ["brand-name"]);
  assert.deepStrictEqual(
    parseTargetIds("  primary-color-hex\n font-color-hex  "),
    ["primary-color-hex", "font-color-hex"],
  );
  assert.deepStrictEqual(parseTargetIds(""), []);
  assert.deepStrictEqual(parseTargetIds(null), []);
});

test("a native control is returned to its rendered default and announced", () => {
  const notified: unknown[] = [];
  const input = {
    value: "Pollmatic",
    dataset: { defaultValue: "LocalPoll" },
  };

  const outcome = applyResetToTarget(input, (target) => notified.push(target));

  assert.strictEqual(outcome, "value");
  assert.strictEqual(input.value, "LocalPoll");
  assert.deepStrictEqual(notified, [input]);
});

test("a control without a rendered default is emptied", () => {
  const input = { value: "leftover", dataset: {} };

  assert.strictEqual(applyResetToTarget(input), "value");
  assert.strictEqual(input.value, "");
});

test("a component owning its reset is asked to reset itself", () => {
  let resets = 0;
  const notified: unknown[] = [];
  const picker = {
    value: "keep-me",
    dataset: { defaultValue: "ignored" },
    resetToDefault: () => {
      resets += 1;
    },
  };

  const outcome = applyResetToTarget(picker, (target) => notified.push(target));

  assert.strictEqual(outcome, "component");
  assert.strictEqual(resets, 1);
  assert.strictEqual(picker.value, "keep-me");
  assert.deepStrictEqual(notified, []);
});

test("a missing or valueless target is skipped instead of throwing", () => {
  assert.strictEqual(applyResetToTarget(null), "skipped");
  assert.strictEqual(applyResetToTarget(undefined), "skipped");
  assert.strictEqual(applyResetToTarget({ dataset: {} }), "skipped");
});

test("a target counts as untouched only while it matches its default", () => {
  const defaults = { dataset: { defaultValue: "LocalPoll" } };

  assert.strictEqual(
    isTargetAtDefault({ ...defaults, value: "LocalPoll" }),
    true,
  );
  assert.strictEqual(
    isTargetAtDefault({ ...defaults, value: "Pollmatic" }),
    false,
  );
  // Case and whitespace are part of the value, not noise around it.
  assert.strictEqual(
    isTargetAtDefault({ ...defaults, value: "localpoll" }),
    false,
  );
  assert.strictEqual(isTargetAtDefault({ value: "", dataset: {} }), true);
});

test("a component decides for itself whether it is untouched", () => {
  assert.strictEqual(
    isTargetAtDefault({ value: "anything", isAtDefault: () => true }),
    true,
  );
  assert.strictEqual(
    isTargetAtDefault({ value: "anything", isAtDefault: () => false }),
    false,
  );
});

test("nothing to reset counts as untouched", () => {
  assert.strictEqual(isTargetAtDefault(null), true);
  assert.strictEqual(isTargetAtDefault({ dataset: {} }), true);
  assert.strictEqual(areTargetsAtDefault([]), true);
});

test("a section is untouched only while every field under it is", () => {
  const untouched = { value: "#fcc435", dataset: { defaultValue: "#fcc435" } };
  const edited = { value: "#8ff0a4", dataset: { defaultValue: "#fcc435" } };

  assert.strictEqual(areTargetsAtDefault([untouched, untouched]), true);
  assert.strictEqual(areTargetsAtDefault([untouched, edited]), false);
});
