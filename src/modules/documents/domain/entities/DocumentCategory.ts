// ============================================================================
// src/modules/documents/domain/entities/DocumentCategory.ts
//
// Admin catalog grouping Document Types (KYC, Income Proof, Collateral,
// Loan Execution, Compliance, Other) — a closed, per-Organization set
// (ADR 0007, docs/modules/documents.md). Framework-free: no Prisma types
// leak past the infrastructure/mappers layer.
// ============================================================================

export interface DocumentCategory {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
