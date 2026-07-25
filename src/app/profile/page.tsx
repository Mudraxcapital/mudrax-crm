import Link from "next/link";
import { requireAuth } from "@/infra/auth/session";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";

export default async function ProfilePage() {
  const { session, authContext } = await requireAuth();

  return (
    <PageSection>
      <PageHeader
        title="Profile"
        description="Your account settings."
        breadcrumbs={[{ label: "Profile" }]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Account" description={session.user.email ?? undefined} />
          <CardBody className="space-y-3 text-sm">
            <p className="font-medium">{session.user.fullName}</p>
            <div className="flex flex-wrap gap-2">
              {authContext.roles.map((role) => (
                <Badge key={role.id} tone="accent" dot>
                  {role.name}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>

        <Link href="/profile/security" className="block">
          <Card className="h-full transition-colors hover:border-accent/40">
            <CardHeader
              title="Security"
              description="Change your password. Requires your current password."
            />
            <CardBody>
              <span className="text-accent text-sm font-medium">Change password →</span>
            </CardBody>
          </Card>
        </Link>
      </div>
    </PageSection>
  );
}
