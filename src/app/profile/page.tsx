import Link from "next/link";
import { requireAuth } from "@/infra/auth/session";
import { getUser } from "@/modules/users";
import { ProfileEditor } from "@/modules/users/presentation/components/ProfileEditor";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";

export default async function ProfilePage() {
  const { session, authContext } = await requireAuth();
  const user = await getUser(session.user.id);

  return (
    <PageSection>
      <PageHeader
        title="Profile"
        description="Your account settings."
        breadcrumbs={[{ label: "Profile" }]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" description={user.email} />
          <CardBody className="space-y-3 text-sm">
            <ProfileEditor user={user} />
            <div className="flex flex-wrap gap-2 pt-2">
              {authContext.roles.map((role) => (
                <Badge key={role.id} tone="accent" dot>
                  {role.name}
                </Badge>
              ))}
            </div>
            <dl className="text-muted grid gap-1 text-xs">
              <div className="flex justify-between gap-3">
                <dt>Employee ID</dt>
                <dd className="font-mono text-foreground">{user.employeeId}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Status</dt>
                <dd className="text-foreground">
                  {user.status === "INACTIVE"
                    ? "Disabled"
                    : user.status === "SUSPENDED"
                      ? "Suspended"
                      : "Active"}
                </dd>
              </div>
              {user.roleName === "Caller" && user.assignedTeamLeadName ? (
                <div className="flex justify-between gap-3">
                  <dt>Team Lead</dt>
                  <dd className="text-foreground">{user.assignedTeamLeadName}</dd>
                </div>
              ) : null}
              {user.roleName === "Team Lead" && user.reportingManagerName ? (
                <div className="flex justify-between gap-3">
                  <dt>Reporting Manager</dt>
                  <dd className="text-foreground">{user.reportingManagerName}</dd>
                </div>
              ) : null}
            </dl>
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
