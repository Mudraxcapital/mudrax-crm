// ============================================================================
// src/modules/integrations/application/ports/ApiKeyPort.ts
//
// API keys physically live in users.ApiKey — integrations configures them
// for inbound connectors without owning the users identity aggregate.
// ============================================================================

export interface IntegrationApiKeyView {
  id: string;
  name: string;
  keyPrefix: string;
  integrationRef: string | null;
  dataScope: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  ownerUserId: string;
}

export interface ApiKeyPort {
  listForOrganizationOwner(ownerUserId: string): Promise<IntegrationApiKeyView[]>;
  create(input: {
    ownerUserId: string;
    name: string;
    integrationRef?: string | null;
    dataScope?: "ORGANIZATION" | "BRANCH" | "TEAM" | "SELF";
    expiresAt?: Date | null;
  }): Promise<{ view: IntegrationApiKeyView; plaintextKey: string }>;
  revoke(id: string, ownerUserId: string): Promise<IntegrationApiKeyView | null>;
  findActiveByPlaintext(plaintextKey: string): Promise<{
    id: string;
    ownerUserId: string;
    integrationRef: string | null;
    dataScope: string;
  } | null>;
  touchLastUsed(id: string): Promise<void>;
}
