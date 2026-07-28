// ============================================================================
// src/modules/lead-center/application/ports/ClassifyDuplicatesPort.ts
// ============================================================================

export type DuplicateMatchMode = "phone" | "email" | "phone_name" | "phone_or_email";

export interface DuplicateClassificationRow {
  rowNumber: number;
  category: "new" | "possible" | "exact";
  matchReason: string | null;
  existingLeadId: string | null;
  existingCustomerId: string | null;
  name: string;
  phone: string;
  email: string;
}

export interface DuplicateClassificationSummary {
  newLeads: DuplicateClassificationRow[];
  possibleDuplicates: DuplicateClassificationRow[];
  exactDuplicates: DuplicateClassificationRow[];
}

/**
 * Port wrapping leads' pure `classifyImportDuplicates` so Lead Center use-cases
 * stay free of the leads composition root (Prisma) during unit tests.
 */
export interface ClassifyDuplicatesPort {
  classify(input: {
    rows: Array<{ rowNumber: number; name: string; phone: string; email: string }>;
    existingLeads: Array<{
      id: string;
      customerId: string;
      fullNameSnapshot: string;
      phoneSnapshot: string | null;
      emailSnapshot: string | null;
      currentStageId: string;
      currentStageName: string;
      stageBucket: string;
      stageSortOrder: number;
      updatedAt: Date;
    }>;
    matchMode: DuplicateMatchMode;
  }): DuplicateClassificationSummary;
}
