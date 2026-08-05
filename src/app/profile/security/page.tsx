import { requireAuth } from "@/infra/auth/session";
import { ChangePasswordForm } from "@/modules/auth/presentation/components/ChangePasswordForm";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";

export default async function ProfileSecurityPage() {
  await requireAuth();

  return (
    <PageSection>
      <PageHeader
        title="Security"
        description="Change your own password. Administrative resets for Managers, Team Leads, and Callers are handled in User Management."
        breadcrumbs={[
          { label: "Profile", href: "/profile" },
          { label: "Security" },
        ]}
      />

      <Card className="max-w-lg">
        <CardHeader
          title="Change password"
          description="Enter your current password, then choose a new one. You will be signed out everywhere afterward."
        />
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </PageSection>
  );
}
