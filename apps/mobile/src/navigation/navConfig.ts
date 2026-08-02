import { filterByPermissions } from "@mudrax/shared";
import type { MainTabParamList } from "./types";

export type IoniconName =
  | "home-outline"
  | "home"
  | "flag-outline"
  | "flag"
  | "list-outline"
  | "list"
  | "time-outline"
  | "time"
  | "trophy-outline"
  | "trophy"
  | "person-outline"
  | "person";

export interface MobileNavItem {
  key: keyof MainTabParamList;
  title: string;
  tabBarLabel: string;
  icon: IoniconName;
  focusedIcon: IoniconName;
  /**
   * Any of these permission codes grants the tab.
   * Empty / omitted = always visible for authenticated staff.
   */
  permissions?: readonly string[];
  /**
   * When true, Caller workspace users see this tab even without `permissions`
   * (web parity: callers open /leaderboard without report.view).
   */
  allowCallerWithoutPermission?: boolean;
  /** When true, only shown for Caller workspace users. */
  callerOnly?: boolean;
  /** When true, hidden for Caller workspace users. */
  hideForCallerWorkspace?: boolean;
}

/**
 * Mobile tabs aligned with web nav modules — gated by the same permission codes.
 * Do not hardcode role names; RBAC codes come from `/api/auth/me`.
 */
export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    key: "Home",
    title: "Dashboard",
    tabBarLabel: "Home",
    icon: "home-outline",
    focusedIcon: "home",
  },
  {
    key: "Campaigns",
    title: "Campaigns",
    tabBarLabel: "Campaigns",
    icon: "flag-outline",
    focusedIcon: "flag",
    permissions: ["campaign.view"],
  },
  {
    key: "LeadQueue",
    title: "Leads",
    tabBarLabel: "Leads",
    icon: "list-outline",
    focusedIcon: "list",
    permissions: ["lead.view"],
  },
  {
    key: "Followups",
    title: "Follow-ups",
    tabBarLabel: "Follow-ups",
    icon: "time-outline",
    focusedIcon: "time",
    permissions: ["follow_up.view"],
  },
  {
    key: "Leaderboard",
    title: "Leaderboard",
    tabBarLabel: "Ranks",
    icon: "trophy-outline",
    focusedIcon: "trophy",
    permissions: ["report.view"],
    allowCallerWithoutPermission: true,
  },
  {
    key: "Profile",
    title: "Profile",
    tabBarLabel: "Profile",
    icon: "person-outline",
    focusedIcon: "person",
  },
];

export function resolveMobileNavItems(
  permissionCodes: readonly string[],
  isCallerWorkspace: boolean,
): MobileNavItem[] {
  const byPermission = MOBILE_NAV_ITEMS.filter((item) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    if (isCallerWorkspace && item.allowCallerWithoutPermission) return true;
    return filterByPermissions([item], permissionCodes).length > 0;
  });
  return byPermission.filter((item) => {
    if (item.callerOnly && !isCallerWorkspace) return false;
    if (item.hideForCallerWorkspace && isCallerWorkspace) return false;
    return true;
  });
}
