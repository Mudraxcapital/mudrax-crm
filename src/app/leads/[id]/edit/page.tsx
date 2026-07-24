import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { getLead, LeadNotFoundError } from "@/modules/leads";
import { EditLeadForm } from "@/modules/leads/presentation/components/EditLeadForm";
import { updateLeadAction } from "@/modules/leads/presentation/controllers/updateLead.action";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("lead.update");
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

  const boundAction = updateLeadAction.bind(null, id);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-12">
      <Link href={`/leads/${id}`} className="text-sm underline underline-offset-4">
        ← Back to Lead
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Edit Lead</h1>
        <p className="text-foreground/60 mt-1 text-sm">{lead.fullNameSnapshot}</p>
      </div>

      <EditLeadForm action={boundAction} lead={lead} />
    </div>
  );
}
