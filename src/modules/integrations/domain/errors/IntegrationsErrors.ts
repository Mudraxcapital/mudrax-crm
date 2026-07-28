// ============================================================================
// src/modules/integrations/domain/errors/IntegrationsErrors.ts
// ============================================================================

export class IntegrationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationsError";
  }
}

export class IntegrationConnectionNotFoundError extends IntegrationsError {
  constructor(id: string) {
    super(`Integration connection not found: ${id}`);
    this.name = "IntegrationConnectionNotFoundError";
  }
}

export class WebhookEndpointNotFoundError extends IntegrationsError {
  constructor(id: string) {
    super(`Webhook endpoint not found: ${id}`);
    this.name = "WebhookEndpointNotFoundError";
  }
}

export class IntegrationCatalogError extends IntegrationsError {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationCatalogError";
  }
}

export class IntegrationAuthError extends IntegrationsError {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationAuthError";
  }
}
