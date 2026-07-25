export interface NavItem {
  /** Stable key when multiple items share an href. */
  id?: string;
  href: string;
  label: string;
  icon: NavIcon;
  match?: "exact" | "prefix" | "customer-360" | "leads-list";
  /** Any of these permissions grants visibility. Empty = staff-only (no extra permission). */
  permissions?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export type NavIcon =
  | "home"
  | "crm"
  | "customers"
  | "leads"
  | "pipeline"
  | "followups"
  | "calendar"
  | "activity"
  | "campaigns"
  | "telephony"
  | "documents"
  | "notifications"
  | "reports"
  | "loans"
  | "org"
  | "settings"
  | "admin"
  | "profile"
  | "history"
  | "performance";

/**
 * Single-company navigation. Leads is a first-class module (not nested under CRM).
 * CRM covers customers, Customer 360, duplicates, and related operational surfaces.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: "home", match: "exact" },
      { href: "/campaigns", label: "Campaigns", icon: "campaigns", permissions: ["campaign.view"] },
      { href: "/reports", label: "Reports", icon: "reports", permissions: ["report.view"] },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    items: [
      {
        id: "crm-overview",
        href: "/crm",
        label: "Overview",
        icon: "crm",
        match: "exact",
        permissions: ["customer.view", "lead.view", "campaign.view"],
      },
      {
        id: "crm-customers",
        href: "/customers",
        label: "Customers",
        icon: "customers",
        match: "exact",
        permissions: ["customer.view"],
      },
      {
        id: "crm-customer-360",
        href: "/customers",
        label: "Customer 360",
        icon: "customers",
        match: "customer-360",
        permissions: ["customer.view"],
      },
      {
        id: "crm-duplicates",
        href: "/customers/duplicates",
        label: "Duplicate Detection",
        icon: "customers",
        permissions: ["customer.merge", "customer.view"],
      },
      {
        id: "crm-activity",
        href: "/activity",
        label: "Activity",
        icon: "activity",
        permissions: ["lead.view", "customer.view"],
      },
      {
        id: "crm-followups",
        href: "/follow-ups",
        label: "Follow-ups",
        icon: "followups",
        permissions: ["follow_up.view"],
      },
      {
        id: "crm-calendar",
        href: "/calendar",
        label: "Calendar",
        icon: "calendar",
        permissions: ["follow_up.view"],
      },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    items: [
      {
        id: "leads-all",
        href: "/leads",
        label: "All Leads",
        icon: "leads",
        match: "leads-list",
        permissions: ["lead.view"],
      },
      {
        id: "leads-pipeline",
        href: "/leads/pipeline",
        label: "Pipeline",
        icon: "pipeline",
        permissions: ["lead.view"],
      },
      {
        id: "leads-excel",
        href: "/leads/import",
        label: "Add from Excel",
        icon: "leads",
        permissions: ["lead.import"],
      },
      {
        id: "leads-settings",
        href: "/crm/field-settings",
        label: "Lead Settings",
        icon: "settings",
        permissions: ["custom_field.manage"],
      },
    ],
  },
  {
    id: "management",
    label: "Management",
    items: [
      {
        href: "/users",
        label: "User Management",
        icon: "admin",
        permissions: ["user.view"],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/profile", label: "Profile", icon: "profile" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === "customer-360") {
    // Customer detail / edit — not the list or duplicates hub.
    return (
      /^\/customers\/[^/]+$/.test(pathname) || /^\/customers\/[^/]+\/edit$/.test(pathname)
    );
  }
  if (item.match === "leads-list") {
    // List + lead detail — not Pipeline or Add from Excel.
    if (pathname.startsWith("/leads/import") || pathname.startsWith("/leads/pipeline")) {
      return false;
    }
    return pathname === "/leads" || pathname.startsWith("/leads/");
  }
  if (item.match === "exact" || item.href === "/") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function navItemKey(item: NavItem): string {
  return item.id ?? item.href;
}

export function filterNavGroups(
  groups: NavGroup[],
  permissionCodes: string[],
): NavGroup[] {
  const held = new Set(permissionCodes);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.permissions || item.permissions.length === 0) return true;
        return item.permissions.some((code) => held.has(code));
      }),
    }))
    .filter((group) => group.items.length > 0);
}
