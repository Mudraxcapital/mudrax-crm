export interface NavItem {
  /** Stable key when multiple items share an href. */
  id?: string;
  href: string;
  label: string;
  icon: NavIcon;
  match?: "exact" | "prefix" | "customers" | "leads-list";
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
  | "lead-center"
  | "telephony"
  | "documents"
  | "notifications"
  | "reports"
  | "loans"
  | "org"
  | "settings"
  | "integrations"
  | "admin"
  | "profile"
  | "history"
  | "performance";

/**
 * Single-company navigation. Leads is a first-class module (not nested under CRM).
 * CRM covers customers, duplicates, and related operational surfaces.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: "home", match: "exact" },
      { href: "/campaigns", label: "Campaigns", icon: "campaigns", permissions: ["campaign.view"] },
      {
        href: "/lead-center",
        label: "Lead Center",
        icon: "lead-center",
        permissions: ["lead_center.view"],
      },
      {
        href: "/leaderboard",
        label: "Leaderboard",
        icon: "performance",
        permissions: ["report.view"],
      },
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
        match: "customers",
        permissions: ["customer.view"],
      },
      {
        id: "crm-duplicates",
        href: "/customers/duplicates",
        label: "Duplicate Detection",
        icon: "customers",
        permissions: ["customer.duplicate.view"],
      },
      {
        id: "crm-followups",
        href: "/follow-ups",
        label: "Follow-ups",
        icon: "followups",
        permissions: ["follow_up.view"],
      },
      {
        id: "crm-notification-channel",
        href: "/notifications/inbox",
        label: "Notification Channel",
        icon: "notifications",
        permissions: ["notification.view"],
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
        id: "leads-single",
        href: "/leads/new",
        label: "Single Lead",
        icon: "leads",
        match: "exact",
        permissions: ["lead.create"],
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
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        href: "/telephony",
        label: "Call Logs",
        icon: "telephony",
        permissions: ["telephony.dashboard.view", "call.view"],
      },
      {
        href: "/documents",
        label: "Documents",
        icon: "documents",
        permissions: ["documents.dashboard.view", "document.view"],
      },
      {
        href: "/notifications",
        label: "Notifications",
        icon: "notifications",
        permissions: ["notifications.dashboard.view"],
      },
      {
        href: "/loans",
        label: "Loans",
        icon: "loans",
        permissions: ["loan_application.view"],
      },
      {
        href: "/banks",
        label: "Banks",
        icon: "org",
        permissions: ["bank.view"],
      },
      {
        href: "/loan-products",
        label: "Loan Products",
        icon: "loans",
        permissions: ["loan_product.view"],
      },
      {
        href: "/disbursements",
        label: "Disbursements",
        icon: "loans",
        permissions: ["disbursement.view"],
      },
      {
        id: "ops-activity",
        href: "/activity",
        label: "Activity",
        icon: "activity",
        // Intentionally staff-only (no extra permission) — same as Dashboard.
        permissions: [],
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
      {
        href: "/crm/field-settings",
        label: "Lead Settings",
        icon: "settings",
        permissions: ["custom_field.manage"],
      },
      {
        href: "/integrations",
        label: "Integrations",
        icon: "integrations",
        permissions: ["integration.view", "integration.manage"],
      },
      {
        href: "/telephony/outcomes",
        label: "Call Outcomes",
        icon: "telephony",
        permissions: ["call.outcome.manage"],
      },
      {
        href: "/documents/categories",
        label: "Document Categories",
        icon: "documents",
        permissions: ["document.category.manage"],
      },
      {
        href: "/notifications/templates",
        label: "Notification Templates",
        icon: "notifications",
        permissions: ["notification.template.manage"],
      },
      { href: "/profile", label: "Profile", icon: "profile" },
    ],
  },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === "customers") {
    // Customers list + detail/edit — not Duplicate Detection.
    if (pathname.startsWith("/customers/duplicates")) return false;
    return pathname === "/customers" || pathname.startsWith("/customers/");
  }
  if (item.match === "leads-list") {
    // List + lead detail — not Pipeline, Add from Excel, or Single Lead create.
    if (
      pathname.startsWith("/leads/import") ||
      pathname.startsWith("/leads/pipeline") ||
      pathname.startsWith("/leads/new")
    ) {
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
