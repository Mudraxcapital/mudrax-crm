// ============================================================================
// src/modules/lead-center/infrastructure/adapters/LeadsDuplicateClassificationAdapter.ts
// ============================================================================

import { classifyImportDuplicates } from "@/modules/leads";
import type { ClassifyDuplicatesPort } from "../../application/ports/ClassifyDuplicatesPort";

export class LeadsDuplicateClassificationAdapter implements ClassifyDuplicatesPort {
  classify: ClassifyDuplicatesPort["classify"] = (input) => classifyImportDuplicates(input);
}
