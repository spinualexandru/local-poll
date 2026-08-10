import assert from "node:assert";
import { test } from "node:test";
import {
  SIDEBAR_COOKIE_NAME,
  isSidebarCollapsed,
  readCookie,
  serializeSidebarCookie,
  sidebarToggleLabel,
} from "../public/components/organisms/sidebar-state.mjs";

test("readCookie picks one value out of a cookie string", () => {
  const header = `localpoll_admin_session=abc; ${SIDEBAR_COOKIE_NAME}=collapsed`;

  assert.strictEqual(readCookie(header, SIDEBAR_COOKIE_NAME), "collapsed");
  assert.strictEqual(readCookie(header, "localpoll_admin_session"), "abc");
  assert.strictEqual(readCookie(header, "missing"), null);
  assert.strictEqual(readCookie(undefined, SIDEBAR_COOKIE_NAME), null);
});

test("readCookie is not fooled by a name that is only a suffix", () => {
  const header = `not_${SIDEBAR_COOKIE_NAME}=collapsed`;

  assert.strictEqual(readCookie(header, SIDEBAR_COOKIE_NAME), null);
});

test("only an explicit collapse produces the icon-only sidebar", () => {
  assert.strictEqual(
    isSidebarCollapsed(`${SIDEBAR_COOKIE_NAME}=collapsed`),
    true,
  );
  assert.strictEqual(
    isSidebarCollapsed(` ${SIDEBAR_COOKIE_NAME} = collapsed `),
    true,
  );
  assert.strictEqual(
    isSidebarCollapsed(`${SIDEBAR_COOKIE_NAME}=expanded`),
    false,
  );
  assert.strictEqual(isSidebarCollapsed(`${SIDEBAR_COOKIE_NAME}=nonsense`), false);
  assert.strictEqual(isSidebarCollapsed(""), false);
  assert.strictEqual(isSidebarCollapsed(undefined), false);
});

test("the preference outlives the session and stays same-site", () => {
  const collapsed = serializeSidebarCookie(true);

  assert.match(collapsed, new RegExp(`^${SIDEBAR_COOKIE_NAME}=collapsed;`));
  assert.match(collapsed, /Path=\/;/);
  assert.match(collapsed, /Max-Age=31536000/);
  assert.match(collapsed, /SameSite=Lax/);
  assert.doesNotMatch(collapsed, /Secure/);

  assert.match(serializeSidebarCookie(false), /=expanded;/);
  assert.match(serializeSidebarCookie(true, { secure: true }), /; Secure$/);
});

test("a round trip through the cookie preserves the preference", () => {
  for (const collapsed of [true, false]) {
    assert.strictEqual(
      isSidebarCollapsed(serializeSidebarCookie(collapsed).split(";")[0]),
      collapsed,
    );
  }
});

test("the toggle is named for the action it performs", () => {
  assert.strictEqual(sidebarToggleLabel(true), "Expand sidebar");
  assert.strictEqual(sidebarToggleLabel(false), "Collapse sidebar");
});
