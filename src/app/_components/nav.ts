export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  match?: "exact" | "prefix";
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
  | "admin";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: "/", label: "Home", icon: "home", match: "exact" },
      {
        href: "/crm",
        label: "CRM Dashboard",
        icon: "crm",
        permissions: ["customer.view", "lead.view", "campaign.view"],
      },
      {
        href: "/crm/field-settings",
        label: "Field Settings",
        icon: "settings",
        permissions: ["custom_field.manage"],
      },
      { href: "/activity", label: "Activity", icon: "activity", permissions: ["lead.view"] },
      { href: "/calendar", label: "Calendar", icon: "calendar", permissions: ["follow_up.view"] },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { href: "/customers", label: "Customers", icon: "customers", permissions: ["customer.view"] },
      { href: "/leads", label: "Leads", icon: "leads", match: "exact", permissions: ["lead.view"] },
      {
        href: "/leads/pipeline",
        label: "Pipeline",
        icon: "pipeline",
        permissions: ["lead.view"],
      },
      {
        href: "/follow-ups",
        label: "Follow-ups",
        icon: "followups",
        permissions: ["follow_up.view"],
      },
      { href: "/campaigns", label: "Campaigns", icon: "campaigns", permissions: ["campaign.view"] },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      { href: "/telephony", label: "Telephony", icon: "telephony", permissions: ["call.view"] },
      {
        href: "/documents",
        label: "Documents",
        icon: "documents",
        permissions: ["document.view"],
      },
      {
        href: "/notifications",
        label: "Notifications",
        icon: "notifications",
        permissions: ["notification.view"],
      },
      { href: "/reports", label: "Reports", icon: "reports", permissions: ["report.view"] },
      {
        href: "/loans",
        label: "Loan Management",
        icon: "loans",
        permissions: ["loan_application.view", "loan_account.view"],
      },
    ],
  },
  {
    id: "admin",
    label: "Organization",
    items: [
      {
        href: "/organizations",
        label: "Organizations",
        icon: "org",
        permissions: ["organization.view"],
      },
      { href: "/branches", label: "Branches", icon: "org", permissions: ["organization.view"] },
      {
        href: "/departments",
        label: "Departments",
        icon: "org",
        permissions: ["organization.view"],
      },
      { href: "/teams", label: "Teams", icon: "org", permissions: ["organization.view"] },
      { href: "/admin", label: "Admin", icon: "admin", permissions: ["role.manage", "user.manage"] },
      {
        href: "/notifications/preferences",
        label: "Settings",
        icon: "settings",
        permissions: ["notification.view"],
      },
    ],
  },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact" || item.href === "/") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
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
