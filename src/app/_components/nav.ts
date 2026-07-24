export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  match?: "exact" | "prefix";
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
      { href: "/crm", label: "CRM Dashboard", icon: "crm" },
      { href: "/activity", label: "Activity", icon: "activity" },
      { href: "/calendar", label: "Calendar", icon: "calendar" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { href: "/customers", label: "Customers", icon: "customers" },
      { href: "/leads", label: "Leads", icon: "leads", match: "exact" },
      { href: "/leads/pipeline", label: "Pipeline", icon: "pipeline" },
      { href: "/follow-ups", label: "Follow-ups", icon: "followups" },
      { href: "/campaigns", label: "Campaigns", icon: "campaigns" },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      { href: "/telephony", label: "Telephony", icon: "telephony" },
      { href: "/documents", label: "Documents", icon: "documents" },
      { href: "/notifications", label: "Notifications", icon: "notifications" },
      { href: "/reports", label: "Reports", icon: "reports" },
      { href: "/loans", label: "Loan Management", icon: "loans" },
    ],
  },
  {
    id: "admin",
    label: "Organization",
    items: [
      { href: "/organizations", label: "Organizations", icon: "org" },
      { href: "/branches", label: "Branches", icon: "org" },
      { href: "/departments", label: "Departments", icon: "org" },
      { href: "/teams", label: "Teams", icon: "org" },
      { href: "/admin", label: "Admin", icon: "admin" },
      { href: "/notifications/preferences", label: "Settings", icon: "settings" },
    ],
  },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact" || item.href === "/") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
