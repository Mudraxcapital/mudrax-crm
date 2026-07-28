import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import {
  getIntegrationCatalog,
  listConnections,
  listFieldMappings,
  redactMetaLeadAdsConfigForUi,
} from "@/modules/integrations";
import { IntegrationsConfigPanel } from "@/modules/integrations/presentation/components/IntegrationsConfigPanel";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";

/**
 * Integrations — Facebook (Meta), Google Ads, and WhatsApp configuration.
 */
export default async function IntegrationsPage() {
  const { authContext } = await requirePermission("integration.view");
  if (isCallerWorkspaceUser(authContext)) {
    redirect("/");
  }

  const canManage = hasPermission(authContext, "integration.manage");
  const catalog = getIntegrationCatalog();
  const connections = await listConnections(authContext.organizationId);

  const mappingsByConnection: Record<
    string,
    Array<{
      connectionId: string;
      externalField: string;
      internalField: string;
      isRequired: boolean;
    }>
  > = {};
  await Promise.all(
    connections.map(async (connection) => {
      const mappings = await listFieldMappings(connection.id);
      mappingsByConnection[connection.id] = mappings.map((mapping) => ({
        connectionId: mapping.connectionId,
        externalField: mapping.externalField,
        internalField: mapping.internalField,
        isRequired: mapping.isRequired,
      }));
    }),
  );

  const facebook = connections.find((c) => c.catalogCode === "facebook_lead_ads");
  const metaAdsConfig = facebook ? redactMetaLeadAdsConfigForUi(facebook.config) : null;
  const appUrl = (process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const metaWebhookUrl = `${appUrl}/api/integrations/meta/webhook`;

  return (
    <PageSection>
      <PageHeader
        title="Integrations"
        description="Connect Meta Lead Ads (Facebook), Google Ads Lead Forms, and WhatsApp Business. Leads land in Lead Center — nothing is listed here."
      />

      {!canManage ? (
        <p className="text-muted mt-2 text-sm">
          You can view integrations. Configuration requires{" "}
          <code className="text-xs">integration.manage</code>.
        </p>
      ) : null}

      <IntegrationsConfigPanel
        catalog={catalog}
        connections={connections.map((c) => ({
          id: c.id,
          catalogCode: c.catalogCode,
          displayName: c.displayName,
          status: c.status,
          leadCenterSource: c.leadCenterSource,
        }))}
        mappingsByConnection={mappingsByConnection}
        metaAdsConfig={metaAdsConfig}
        metaWebhookUrl={metaWebhookUrl}
        canManage={canManage}
      />
    </PageSection>
  );
}
