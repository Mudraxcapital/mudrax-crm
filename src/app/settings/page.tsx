import Link from "next/link";
import { requireInternalStaff } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";

const SETTINGS_LINKS = [
  {
    href: "/profile/security",
    label: "Change password",
    description: "Update your own password (requires current password).",
    permission: null,
  },
  {
    href: "/notifications/preferences",
    label: "Notification preferences",
    description: "Channel and quiet-hour preferences.",
    permission: "notification.view",
  },
  {
    href: "/crm/field-settings",
    label: "Lead Settings",
    description: "Configure custom lead fields and Add from Excel mapping.",
    permission: "custom_field.manage",
  },
  {
    href: "/users",
    label: "User Management",
    description: "Employees, roles, and access.",
    permission: "user.view",
  },
] as const;

export default async function SettingsPage() {
  const { authContext } = await requireInternalStaff();

  const links = SETTINGS_LINKS.filter(
    (link) =>
      link.permission === null ||
      (typeof link.permission === "string" && hasPermission(authContext, link.permission)),
  );

  return (
    <PageSection>
      <PageHeader
        title="Settings"
        description="Company workspace configuration for Mudrax Capitals."
        breadcrumbs={[{ label: "Settings" }]}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <Card className="transition-colors hover:border-accent/40">
              <CardHeader title={link.label} description={link.description} />
              <CardBody>
                <span className="text-accent text-sm font-medium">Open →</span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </PageSection>
  );
}
