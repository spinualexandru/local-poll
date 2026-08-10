export const SIDEBAR_COOKIE_NAME: string;
export const SIDEBAR_COLLAPSED: string;
export const SIDEBAR_EXPANDED: string;

export function readCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null;

export function isSidebarCollapsed(
  cookieHeader: string | null | undefined,
): boolean;

export function serializeSidebarCookie(
  collapsed: boolean,
  options?: { secure?: boolean },
): string;

export function sidebarToggleLabel(collapsed: boolean): string;
