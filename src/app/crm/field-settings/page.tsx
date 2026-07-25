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
        title="Field Settings"
        description="Configure every lead field used across the CRM — forms, import mapping, search, filters, and export."
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Field Settings" },
        ]}
        actions={
          <Link href="/crm" className="text-sm text-accent hover:underline underline-offset-4">
            ← CRM Dashboard
          </Link>
        }
      />
      <LeadFieldSettingsPanel fields={fields} />
    </PageSection>
  );
}
