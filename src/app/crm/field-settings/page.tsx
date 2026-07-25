import Link from "next/link";
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
        description="Configure every lead field — forms, Add from Excel mapping, search, filters, and export."
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: "Lead Settings" },
        ]}
        actions={
          <Link href="/leads" className="text-sm text-accent hover:underline underline-offset-4">
            ← All Leads
          </Link>
        }
      />
      <LeadFieldSettingsPanel fields={fields} />
    </PageSection>
  );
}
