import Link from "next/link";
import { requireCallerWorkspace } from "@/infra/auth/session";
import { LoginDurationTimer } from "@/modules/caller-workspace/presentation/components/LoginDurationTimer";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";

export default async function CallerProfilePage() {
  const { session, authContext } = await requireCallerWorkspace();

  return (
    <PageSection>
      <PageHeader
        title="Profile"
        description="Your Caller account details."
        meta={<LoginDurationTimer loginAt={session.user.loginAt} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title={session.user.fullName} description={session.user.email ?? undefined} />
          <CardBody className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              {authContext.roles.map((role) => (
                <Badge key={role.id} tone="accent" dot>
                  {role.name}
                </Badge>
              ))}
            </div>
            <p className="text-muted">
              Organization scope is enforced automatically. You only see leads assigned to you.
            </p>
            <div className="pt-2">
              <LogoutButton />
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
