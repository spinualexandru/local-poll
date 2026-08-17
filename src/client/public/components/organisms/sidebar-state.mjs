/**
 * The collapsed/expanded sidebar preference.
 *
 * The browser writes it when the toggle is used and the server reads it back
 * when rendering, so a refresh serves the sidebar already in the chosen shape
 * instead of flashing the other width before this module loads.
 */

export const SIDEBAR_COOKIE_NAME = "localpoll_sidebar";
export const SIDEBAR_COLLAPSED = "collapsed";
export const SIDEBAR_EXPANDED = "expanded";

/** A year: this is a lasting UI habit, not session state. */
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Reads one cookie out of a `Cookie` header or `document.cookie`.
 * @param cookieHeader - The raw cookie string, if there is one.
 * @param name - The cookie to look for.
 * @returns The value, or null when the cookie is absent.
 */
export const readCookie = (cookieHeader, name) => {
  for (const item of String(cookieHeader || "").split(";")) {
    const separatorIndex = item.indexOf("=");
    if (separatorIndex === -1) continue;
    if (item.slice(0, separatorIndex).trim() !== name) continue;

    return item.slice(separatorIndex + 1).trim();
  }

  return null;
};

/**
 * Reports the stored preference. Anything other than an explicit collapse —
 * no cookie, a stale value — means the full sidebar.
 * @param cookieHeader - The raw cookie string, if there is one.
 */
export const isSidebarCollapsed = (cookieHeader) =>
  readCookie(cookieHeader, SIDEBAR_COOKIE_NAME) === SIDEBAR_COLLAPSED;

/**
 * Builds the cookie that records the preference.
 * @param collapsed - Whether the sidebar is now icon-only.
 * @param options - `secure` marks the cookie for HTTPS origins.
 */
export const serializeSidebarCookie = (collapsed, { secure = false } = {}) => {
  const value = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  const flags = `Path=/; Max-Age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
  return `${SIDEBAR_COOKIE_NAME}=${value}; ${flags}${secure ? "; Secure" : ""}`;
};

/** Names the action the toggle performs from its current state. */
export const sidebarToggleLabel = (collapsed) =>
  collapsed ? "Expand sidebar" : "Collapse sidebar";
