import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { leadCatalogs, listActiveLeadFields } from "@/modules/leads";
import { listUserSummaries } from "@/modules/users";
import { LeadForm } from "@/modules/leads/presentation/components/LeadForm";
import { createLeadAction } from "@/modules/leads/presentation/controllers/createLead.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";

export default async function SingleLeadPage() {
  const { authContext } = await requirePermission("lead.create");

  const [sourcesRaw, assignees, fields] = await Promise.all([
    leadCatalogs.listSources(authContext.organizationId),
    listUserSummaries(authContext.organizationId),
    listActiveLeadFields(authContext.organizationId),
  ]);

  const sources = excludeTestCatalogRows(sourcesRaw);
  const defaultLeadSourceId = sources[0]?.id;

  return (
    <PageSection>
      <PageHeader
        title="Single Lead"
        description="Add one lead using your Lead Settings fields."
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: "Single Lead" },
        ]}
        actions={
          <Link href="/leads" className="text-sm text-accent hover:underline underline-offset-4">
            ← All Leads
          </Link>
        }
      />

      <LeadForm
        action={createLeadAction}
        sources={sources}
        assignees={assignees.map((user) => ({ id: user.id, fullName: user.fullName }))}
        fields={fields}
        defaultLeadSourceId={defaultLeadSourceId}
      />
    </PageSection>
  );
}
