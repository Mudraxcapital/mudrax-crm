import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { getTeam, listBranches, TeamNotFoundError } from "@/modules/organization";
import { TeamForm } from "@/modules/organization/presentation/components/TeamForm";
import { updateTeamAction } from "@/modules/organization/presentation/controllers/updateTeam.action";

export default async function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { authContext } = await requirePermission("team.manage");
  const { id } = await params;

  let team;
  try {
    team = await getTeam(id);
  } catch (error) {
    if (error instanceof TeamNotFoundError) {
      notFound();
    }
    throw error;
  }

  const branches = await listBranches(authContext.organizationId);
  const boundAction = updateTeamAction.bind(null, id);

  return (
    <div className="mx-page flex max-w-xl flex-col gap-6">
      <Link href="/teams" className="text-sm text-accent hover:underline underline-offset-4">
        ← Back to Teams
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit Team</h1>
        <p className="text-muted mt-1 text-sm">{team.name}</p>
      </div>

      <TeamForm action={boundAction} team={team} branches={branches} submitLabel="Save changes" />
    </div>
  );
}
