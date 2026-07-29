import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  createVoteOption,
  getSelectedOptionIds,
} from "../public/pages/poll-vote-option.mjs";

class FakeElement {
  public readonly children: FakeElement[] = [];
  public readonly localName: string;
  public htmlFor = "";
  public id = "";
  public name = "";
  public required = false;
  public textContent = "";
  public type = "";
  public value = "";

  public constructor(localName: string) {
    this.localName = localName;
  }

  public append(...children: FakeElement[]) {
    this.children.push(...children);
  }
}

const fakeDocument = {
  createElement(localName: string) {
    return new FakeElement(localName);
  },
};

test("single-choice polls render a required radio control", () => {
  const control = createVoteOption(fakeDocument, "First option", 0, false);
  const [input, label] = control.children;

  assert.strictEqual(control.localName, "lp-radio");
  assert.strictEqual(input.type, "radio");
  assert.strictEqual(input.name, "pollOption");
  assert.strictEqual(input.value, "0");
  assert.strictEqual(input.id, "poll-option-0");
  assert.strictEqual(input.required, true);
  assert.strictEqual(label.htmlFor, "poll-option-0");
  assert.strictEqual(label.textContent, "First option");
});

test("multiple-choice polls render a checkbox control", () => {
  const control = createVoteOption(fakeDocument, "Second option", 1, true);
  const [input, label] = control.children;

  assert.strictEqual(control.localName, "lp-checkbox");
  assert.strictEqual(input.type, "checkbox");
  assert.strictEqual(input.name, "pollOption");
  assert.strictEqual(input.value, "1");
  assert.strictEqual(input.id, "poll-option-1");
  assert.strictEqual(input.required, false);
  assert.strictEqual(label.htmlFor, "poll-option-1");
  assert.strictEqual(label.textContent, "Second option");
});

test("vote submission gathers every checked option", () => {
  const form = {
    querySelectorAll(selector: string) {
      assert.strictEqual(selector, "input[name='pollOption']:checked");
      return [{ value: "0" }, { value: "2" }];
    },
  };

  assert.deepStrictEqual(getSelectedOptionIds(form), [0, 2]);
});

test("poll creation keeps mutually exclusive poll types as radios", () => {
  const template = readFileSync(
    join(
      process.cwd(),
      "src",
      "client",
      "app",
      "pages",
      "poll",
      "create",
      "configuration",
      "index.html",
    ),
    "utf8",
  );

  assert.strictEqual(template.match(/type="radio"/g)?.length, 2);
  assert.doesNotMatch(template, /type="checkbox"/);
});
