import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { getOrganization, OrganizationNotFoundError } from "@/modules/organization";
import { OrganizationForm } from "@/modules/organization/presentation/components/OrganizationForm";
import { updateOrganizationAction } from "@/modules/organization/presentation/controllers/updateOrganization.action";

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("organization.manage");
  const { id } = await params;

  let organization;
  try {
    organization = await getOrganization(id);
  } catch (error) {
    if (error instanceof OrganizationNotFoundError) {
      notFound();
    }
    throw error;
  }

  const boundAction = updateOrganizationAction.bind(null, id);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-12">
      <Link href="/organizations" className="text-sm underline underline-offset-4">
        ← Back to Organizations
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Edit Organization</h1>
        <p className="text-foreground/60 mt-1 text-sm">{organization.name}</p>
      </div>

      <OrganizationForm
        action={boundAction}
        organization={organization}
        submitLabel="Save changes"
      />
    </div>
  );
}
