// ============================================================================
// src/modules/documents/application/use-cases/listDocumentAuditLog.ts
//
// Read-only Audit Trail access for one Document — the append-only history
// of its upload, revisions, re-classifications, and verification decisions
// (mirrors telephony's listCallAttemptAuditLog.ts).
// ============================================================================

import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import type { DocumentsAuditRecord } from "../../domain/entities/DocumentsAuditRecord";

export function makeListDocumentAuditLog(repository: DocumentRepository) {
  return async function listDocumentAuditLog(documentId: string): Promise<DocumentsAuditRecord[]> {
    return repository.listAuditLog("Document", documentId);
  };
}
