import { redirect } from "next/navigation";
import { requireAuth } from "@/infra/auth/session";
import { getUser, roleMaySelfServiceChangePassword } from "@/modules/users";
import { ChangePasswordForm } from "@/modules/auth/presentation/components/ChangePasswordForm";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";

export default async function ProfileSecurityPage() {
  const { session } = await requireAuth();
  const user = await getUser(session.user.id);

  if (!roleMaySelfServiceChangePassword(user.roleName)) {
    redirect("/profile");
  }

  return (
    <PageSection>
      <PageHeader
        title="Security"
        description="Change your own password. Administrative resets are handled separately in User Management."
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
