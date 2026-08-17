import assert from "node:assert";
import { test } from "node:test";
import { getMultipartBoundary, parseMultipart } from "../multipart.ts";

const BOUNDARY = "----localPollBoundary";

const buildBody = (parts: string[]): Buffer =>
  Buffer.from(
    parts.map((part) => `--${BOUNDARY}\r\n${part}\r\n`).join("") +
      `--${BOUNDARY}--\r\n`,
    "binary",
  );

test("boundary is read from quoted and bare content type headers", () => {
  assert.strictEqual(
    getMultipartBoundary('multipart/form-data; boundary="abc123"'),
    "abc123",
  );
  assert.strictEqual(
    getMultipartBoundary("multipart/form-data; boundary=abc123"),
    "abc123",
  );
  assert.strictEqual(
    getMultipartBoundary("application/x-www-form-urlencoded"),
    null,
  );
  assert.strictEqual(getMultipartBoundary(undefined), null);
  assert.strictEqual(getMultipartBoundary("multipart/form-data"), null);
});

test("text fields and files are separated by their content disposition", () => {
  const body = buildBody([
    'Content-Disposition: form-data; name="brandName"\r\n\r\nNight Shift Polls',
    'Content-Disposition: form-data; name="primaryColorHex"\r\n\r\n#0055ff',
    'Content-Disposition: form-data; name="logo"; filename="mark.png"\r\n' +
      "Content-Type: image/png\r\n\r\nbinary-bytes",
  ]);

  const { fields, files } = parseMultipart(body, BOUNDARY);

  assert.strictEqual(fields.get("brandName"), "Night Shift Polls");
  assert.strictEqual(fields.get("primaryColorHex"), "#0055ff");
  assert.strictEqual(files.get("logo")?.filename, "mark.png");
  assert.strictEqual(files.get("logo")?.contentType, "image/png");
  assert.strictEqual(files.get("logo")?.data.toString(), "binary-bytes");
});

test("binary payloads survive parsing byte for byte", () => {
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const body = Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="logo"; filename="mark.png"\r\n\r\n`,
    ),
    bytes,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);

  const { files } = parseMultipart(body, BOUNDARY);

  assert.ok(files.get("logo")?.data.equals(bytes));
});

test("an empty file input is reported as an empty upload rather than a field", () => {
  const body = buildBody([
    'Content-Disposition: form-data; name="logo"; filename=""\r\n' +
      "Content-Type: application/octet-stream\r\n\r\n",
  ]);

  const { fields, files } = parseMultipart(body, BOUNDARY);

  assert.strictEqual(fields.get("logo"), null);
  assert.strictEqual(files.get("logo")?.filename, "");
  assert.strictEqual(files.get("logo")?.data.length, 0);
});

test("a body without the declared boundary is rejected", () => {
  assert.throws(
    () => parseMultipart(Buffer.from("brandName=Polls"), BOUNDARY),
    /boundary not found/,
  );
});

test("a truncated body is rejected instead of yielding a partial part", () => {
  const body = Buffer.from(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="brandName"\r\n\r\nPolls`,
  );

  assert.throws(() => parseMultipart(body, BOUNDARY), /unterminated part/);
});
