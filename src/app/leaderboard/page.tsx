import { requireAuth } from "@/infra/auth/session";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { redirect } from "next/navigation";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { LeaderboardView } from "./_components/LeaderboardView";
import { loadLeaderboardDashboard } from "./_lib/loadLeaderboardDashboard";
import { parseLeaderboardQuery } from "./_lib/parseLeaderboardQuery";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { authContext } = await requireAuth();
  const isCallerOnly = isCallerWorkspaceUser(authContext);

  if (!isCallerOnly && !hasPermission(authContext, "report.view")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const query = parseLeaderboardQuery(params);

  const data = await loadLeaderboardDashboard({
    authContext,
    query,
    isCallerOnly,
  });

  return (
    <PageSection>
      <PageHeader
        title="Leaderboard"
        description={
          isCallerOnly
            ? "Your call, follow-up, and conversion performance."
            : "Hierarchy-scoped performance rankings across calls, talk time, and conversions."
        }
        meta={
          <span className="text-muted text-xs">
            {new Date(data.dateFrom).toLocaleString()} → {new Date(data.dateTo).toLocaleString()}
          </span>
        }
      />
      <LeaderboardView data={data} query={query} />
    </PageSection>
  );
}
