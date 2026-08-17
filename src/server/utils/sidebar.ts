import {
  isSidebarCollapsed,
  sidebarToggleLabel,
} from "../../client/public/components/organisms/sidebar-state.mjs";

export interface SidebarView {
  sidebarCollapsed: string;
  sidebarExpanded: string;
  sidebarToggleLabel: string;
}

/**
 * Describes the sidebar for a render, using the preference the browser stored
 * the last time the toggle was used. Serving the collapsed markup up front is
 * what keeps a refresh from flashing the full-width sidebar.
 *
 * @param cookieHeader - The request's `Cookie` header, if it sent one.
 */
export const getSidebarView = (
  cookieHeader: string | undefined,
): SidebarView => {
  const collapsed = isSidebarCollapsed(cookieHeader);

  return {
    sidebarCollapsed: collapsed ? "collapsed" : "",
    sidebarExpanded: collapsed ? "false" : "true",
    sidebarToggleLabel: sidebarToggleLabel(collapsed),
  };
};
