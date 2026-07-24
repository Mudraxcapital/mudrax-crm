// ============================================================================
// prisma/seed/steps/08-document-catalogs.ts
//
// Seeds requirement #1 (lookup/catalog tables) for the `documents` module:
// Document Category and Document Type — "a closed, versionable set"
// (documents.md) that every KYC/income/collateral checklist references.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

export interface DocumentCatalogSeedResult {
  documentCategoryIds: Record<string, string>;
  documentTypeIds: Record<string, string>;
}

const DOCUMENT_CATEGORIES_WITH_TYPES: { category: string; types: string[] }[] = [
  { category: "KYC", types: ["PAN Card", "Aadhaar Card", "Passport", "Voter ID"] },
  {
    category: "Income Proof",
    types: ["Salary Slip", "Bank Statement", "Form 16", "ITR Acknowledgement"],
  },
  { category: "Collateral", types: ["Property Title Deed", "Vehicle Registration Certificate"] },
  { category: "Loan Execution", types: ["Loan Agreement", "Sanction Letter"] },
  { category: "Compliance", types: ["Signed Consent Form"] },
  { category: "Other", types: ["Photograph", "Signature Specimen"] },
];

export async function seedDocumentCatalogs(
  prisma: PrismaClient,
  organizationId: string,
): Promise<DocumentCatalogSeedResult> {
  section("8. Documents module catalogs (Document Category, Document Type)");

  explain(
    "Six Document Categories (KYC, Income Proof, Collateral, Loan Execution, Compliance, Other) grouping the closed Document Type catalog below.",
  );
  const documentCategoryIds: Record<string, string> = {};
  const documentTypeIds: Record<string, string> = {};
  let typeCount = 0;

  for (const group of DOCUMENT_CATEGORIES_WITH_TYPES) {
    const category = await prisma.documentCategory.upsert({
      where: { organizationId_name: { organizationId, name: group.category } },
      update: {},
      create: { organizationId, name: group.category },
    });
    documentCategoryIds[group.category] = category.id;

    for (const typeName of group.types) {
      const type = await prisma.documentType.upsert({
        where: { organizationId_name: { organizationId, name: typeName } },
        update: { documentCategoryId: category.id },
        create: { organizationId, documentCategoryId: category.id, name: typeName },
      });
      documentTypeIds[typeName] = type.id;
      typeCount += 1;
    }
  }

  explain(
    "Document Types are each admin catalog entries scoped to exactly one Category (e.g. 'PAN Card' under KYC).",
  );

  summary("Document Categories", DOCUMENT_CATEGORIES_WITH_TYPES.length);
  summary("Document Types", typeCount);

  return { documentCategoryIds, documentTypeIds };
}
