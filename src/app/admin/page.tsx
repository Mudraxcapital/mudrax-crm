import { requireRole } from "@/infra/auth/session";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";

// Demonstrates middleware's admin-route protection requirement. Full Admin
// configuration screens (Role/Permission management, etc.) are CRM-feature
// work explicitly out of scope for this task — this page only proves the
// guard (requireRole -> /unauthorized redirect for non-Admins).
export default async function AdminPage() {
  const { session } = await requireRole("Admin");

  return (
    <PageSection>
      <PageHeader
        title="Admin"
        description="Restricted area for organization administrators."
        meta={
          <Badge tone="accent" dot>
            Admin role required
          </Badge>
        }
      />
      <Card>
        <CardBody>
          <p className="text-sm leading-relaxed">
            Welcome, <span className="font-medium">{session.user.fullName}</span>. Role and
            permission management screens will live here as admin configuration expands.
          </p>
        </CardBody>
      </Card>
    </PageSection>
  );
}
