import assert from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const filesUnder = (root: string): string[] =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });

test("production templates use external autonomous components", () => {
  const templateRoot = join(process.cwd(), "src", "client", "app");

  for (const file of filesUnder(templateRoot).filter(
    (path) => extname(path) === ".html",
  )) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\sis\s*=/i, `${file} uses is=`);
    assert.doesNotMatch(source, /\sstyle\s*=/i, `${file} has inline styles`);
    assert.doesNotMatch(source, /<style(?:\s|>)/i, `${file} has a style tag`);

    for (const script of source.matchAll(/<script\b([^>]*)>/gi)) {
      assert.match(
        script[1],
        /\bsrc\s*=/i,
        `${file} has an inline executable script`,
      );
    }
  }
});

test("page modules do not generate inline styles", () => {
  const pageRoot = join(process.cwd(), "src", "client", "public", "pages");
  for (const file of filesUnder(pageRoot)) {
    assert.doesNotMatch(
      readFileSync(file, "utf8"),
      /\.style(?:\.|\[)/,
      `${file} generates inline styles`,
    );
  }
});

test("browser modules pass Node syntax checking", () => {
  const publicRoot = join(process.cwd(), "src", "client", "public");
  for (const file of filesUnder(publicRoot).filter(
    (path) => extname(path) === ".mjs",
  )) {
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    assert.strictEqual(
      result.status,
      0,
      `${file} failed syntax checking:\n${result.stderr}`,
    );
  }
});
