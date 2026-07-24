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
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-12">
      <Link href="/branches" className="text-sm underline underline-offset-4">
        ← Back to Branches
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Edit Branch</h1>
        <p className="text-foreground/60 mt-1 text-sm">{branch.name}</p>
      </div>

      <BranchForm action={boundAction} branch={branch} submitLabel="Save changes" />
    </div>
  );
}
