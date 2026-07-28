// ============================================================================
// src/modules/lead-center/domain/errors/LeadCenterErrors.ts
// ============================================================================

export class LeadCenterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadCenterError";
  }
}

export class StagedLeadNotFoundError extends LeadCenterError {
  constructor(id: string) {
    super(`Staged lead not found: ${id}`);
    this.name = "StagedLeadNotFoundError";
  }
}

export class IngestionBatchNotFoundError extends LeadCenterError {
  constructor(id: string) {
    super(`Ingestion batch not found: ${id}`);
    this.name = "IngestionBatchNotFoundError";
  }
}

export class InvalidLeadCenterSourceError extends LeadCenterError {
  constructor(code: string) {
    super(`Unknown or inactive Lead Center source: ${code}`);
    this.name = "InvalidLeadCenterSourceError";
  }
}

export class IngestionValidationError extends LeadCenterError {
  constructor(message: string) {
    super(message);
    this.name = "IngestionValidationError";
  }
}
