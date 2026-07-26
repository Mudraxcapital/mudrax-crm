import { requirePermission } from "@/infra/auth/session";
import { listLeadFields } from "@/modules/leads";
import { LeadFieldSettingsPanel } from "@/modules/leads/presentation/components/LeadFieldSettingsPanel";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";

export default async function FieldSettingsPage() {
  const { authContext } = await requirePermission("custom_field.manage");
  const fields = await listLeadFields(authContext.organizationId);

  return (
    <PageSection>
      <PageHeader
        title="Lead Settings"
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: "Lead Settings" },
        ]}
      />
      <LeadFieldSettingsPanel fields={fields} />
    </PageSection>
  );
}
