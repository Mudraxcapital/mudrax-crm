import type { NavGroup, NavIcon } from "./nav";

export type CallerNavIcon = NavIcon | "profile" | "history" | "performance";

export interface CallerNavItem {
  id?: string;
  href: string;
  label: string;
  icon: CallerNavIcon;
  match?: "exact" | "prefix";
}

export interface CallerNavGroup {
  id: string;
  label: string;
  items: CallerNavItem[];
}

/**
 * Dedicated Caller Workspace sidebar — intentionally disjoint from admin NAV_GROUPS.
 */
export const CALLER_NAV_GROUPS: CallerNavGroup[] = [
  {
    id: "main",
    label: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: "home", match: "exact" },
      { href: "/caller/campaigns", label: "My Campaigns", icon: "campaigns" },
      { href: "/caller/leads", label: "My Leads", icon: "leads" },
      { href: "/caller/history", label: "Call History", icon: "history" },
      { href: "/caller/performance", label: "My Performance", icon: "performance" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { href: "/caller/notifications", label: "Notifications", icon: "notifications" },
      { href: "/profile", label: "Profile", icon: "profile" },
      { href: "/profile/security", label: "Security", icon: "settings" },
    ],
  },
];

export function isCallerNavActive(pathname: string, item: CallerNavItem): boolean {
  if (item.match === "exact" || item.href === "/") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Adapt caller groups to the shared NavGroup shape used by AppShell. */
export function callerNavAsNavGroups(): NavGroup[] {
  return CALLER_NAV_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((item) => ({
      id: item.id,
      href: item.href,
      label: item.label,
      icon: item.icon as NavIcon,
      match: item.match === "exact" ? "exact" : "prefix",
    })),
  }));
}
