import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { getBranch, BranchNotFoundError } from "@/modules/organization";
import { BranchForm } from "@/modules/organization/presentation/components/BranchForm";
import { updateBranchAction } from "@/modules/organization/presentation/controllers/updateBranch.action";

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("branch.manage");
  const { id } = await params;

  let branch;
  try {
    branch = await getBranch(id);
  } catch (error) {
    if (error instanceof BranchNotFoundError) {
      notFound();
    }
    throw error;
  }

  const boundAction = updateBranchAction.bind(null, id);

  return (
    <div className="mx-page flex max-w-xl flex-col gap-6">
      <Link href="/branches" className="text-sm text-accent hover:underline underline-offset-4">
        ← Back to Branches
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit Branch</h1>
        <p className="text-muted mt-1 text-sm">{branch.name}</p>
      </div>

      <BranchForm action={boundAction} branch={branch} submitLabel="Save changes" />
    </div>
  );
}
