// ============================================================================
// src/modules/documents/domain/entities/DocumentType.ts
//
// Admin catalog entry ("PAN Card", "Aadhaar", "Salary Slip", "Bank
// Statement", "Photo", "Signature") belonging to exactly one Document
// Category. Every Document is classified by exactly one Document Type, so
// the catalog must exist before any upload can happen (ADR 0007).
// ============================================================================

export interface DocumentType {
  id: string;
  organizationId: string;
  documentCategoryId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
