import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { getLead, LeadNotFoundError, listActiveLeadFields } from "@/modules/leads";
import { EditLeadForm } from "@/modules/leads/presentation/components/EditLeadForm";
import { updateLeadAction } from "@/modules/leads/presentation/controllers/updateLead.action";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { authContext } = await requirePermission("lead.update");
  const { id } = await params;

  let lead;
  try {
    lead = await getLead(id);
  } catch (error) {
    if (error instanceof LeadNotFoundError) {
      notFound();
    }
    throw error;
  }

  const fields = await listActiveLeadFields(authContext.organizationId);
  const boundAction = updateLeadAction.bind(null, id);

  return (
    <div className="mx-page flex max-w-xl flex-col gap-6">
      <Link href={`/leads/${id}`} className="text-sm text-accent hover:underline underline-offset-4">
        ← Back to Lead
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit Lead</h1>
        <p className="text-muted mt-1 text-sm">{lead.fullNameSnapshot}</p>
      </div>

      <EditLeadForm action={boundAction} lead={lead} fields={fields} />
    </div>
  );
}
