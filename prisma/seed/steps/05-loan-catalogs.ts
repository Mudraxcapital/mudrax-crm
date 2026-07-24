// ============================================================================
// prisma/seed/steps/05-loan-catalogs.ts
//
// Seeds requirement #1 (lookup/catalog tables) for the loan lifecycle
// modules: Loan Product Type (loan_products), Application Status
// (loan_applications), and Loan Status / EMI Pay Status (loan_accounts).
// Grouped in one step because together they form the loan-status vocabulary
// a Loan moves through end to end, even though each catalog is owned by a
// different bounded context and is "permanently distinct" from the others
// by explicit design (see each model's own doc comment).
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { ApplicationStatusBucket } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

export interface LoanCatalogSeedResult {
  loanProductTypeIds: Record<string, string>;
  applicationStatusIds: Record<string, string>;
  loanStatusIds: Record<string, string>;
  emiPayStatusIds: Record<string, string>;
}

const LOAN_PRODUCT_TYPES = [
  "Personal Loan",
  "Home Loan",
  "Loan Against Property",
  "Car Loan",
  "Business Loan",
];

const APPLICATION_STATUSES: {
  name: string;
  bucket: ApplicationStatusBucket;
  isTerminal: boolean;
  sortOrder: number;
}[] = [
  { name: "Draft", bucket: ApplicationStatusBucket.DRAFT, isTerminal: false, sortOrder: 1 },
  { name: "Submitted", bucket: ApplicationStatusBucket.SUBMITTED, isTerminal: false, sortOrder: 2 },
  {
    name: "Under Bank Review",
    bucket: ApplicationStatusBucket.UNDER_BANK_REVIEW,
    isTerminal: false,
    sortOrder: 3,
  },
  { name: "Approved", bucket: ApplicationStatusBucket.APPROVED, isTerminal: false, sortOrder: 4 },
  {
    name: "Disbursement Pending",
    bucket: ApplicationStatusBucket.DISBURSEMENT_PENDING,
    isTerminal: false,
    sortOrder: 5,
  },
  {
    name: "Converted to Loan Account",
    bucket: ApplicationStatusBucket.CONVERTED,
    isTerminal: true,
    sortOrder: 6,
  },
  { name: "Rejected", bucket: ApplicationStatusBucket.REJECTED, isTerminal: true, sortOrder: 7 },
  { name: "Withdrawn", bucket: ApplicationStatusBucket.WITHDRAWN, isTerminal: true, sortOrder: 8 },
];

const LOAN_STATUSES: { name: string; isTerminal: boolean; sortOrder: number }[] = [
  { name: "Active", isTerminal: false, sortOrder: 1 },
  { name: "Overdue", isTerminal: false, sortOrder: 2 },
  { name: "NPA (Non-Performing Asset)", isTerminal: false, sortOrder: 3 },
  { name: "Foreclosed", isTerminal: true, sortOrder: 4 },
  { name: "Closed", isTerminal: true, sortOrder: 5 },
  { name: "Written Off", isTerminal: true, sortOrder: 6 },
];

const EMI_PAY_STATUSES = ["Pending", "Paid", "Paid Late", "Partially Paid", "Overdue", "Bounced"];

export async function seedLoanCatalogs(
  prisma: PrismaClient,
  organizationId: string,
): Promise<LoanCatalogSeedResult> {
  section("5. Loan lifecycle catalogs (loan_products, loan_applications, loan_accounts)");

  explain(
    "Loan Product Type — closed, admin-extendable catalog of lending products offered (loan-products.md).",
  );
  const loanProductTypeIds: Record<string, string> = {};
  for (const name of LOAN_PRODUCT_TYPES) {
    const row = await prisma.loanProductType.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    });
    loanProductTypeIds[name] = row.id;
  }

  explain(
    "Application Status — 'where is this Loan Application in the decisioning pipeline' catalog, permanently distinct from Loan Status and EMI Pay Status (loan-applications.md).",
  );
  const applicationStatusIds: Record<string, string> = {};
  for (const status of APPLICATION_STATUSES) {
    const row = await prisma.applicationStatus.upsert({
      where: { organizationId_name: { organizationId, name: status.name } },
      update: { bucket: status.bucket, isTerminal: status.isTerminal, sortOrder: status.sortOrder },
      create: {
        organizationId,
        name: status.name,
        bucket: status.bucket,
        isTerminal: status.isTerminal,
        sortOrder: status.sortOrder,
      },
    });
    applicationStatusIds[status.name] = row.id;
  }

  explain(
    "Loan Status — 'what state is this Loan Account in right now' catalog (loan-accounts.md).",
  );
  const loanStatusIds: Record<string, string> = {};
  for (const status of LOAN_STATUSES) {
    const row = await prisma.loanStatus.upsert({
      where: { organizationId_name: { organizationId, name: status.name } },
      update: { isTerminal: status.isTerminal, sortOrder: status.sortOrder },
      create: {
        organizationId,
        name: status.name,
        isTerminal: status.isTerminal,
        sortOrder: status.sortOrder,
      },
    });
    loanStatusIds[status.name] = row.id;
  }

  explain(
    "EMI Pay Status — per-installment payment-state catalog, a third catalog distinct from Application Status and Loan Status (loan-accounts.md).",
  );
  const emiPayStatusIds: Record<string, string> = {};
  for (const name of EMI_PAY_STATUSES) {
    const row = await prisma.emiPayStatus.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    });
    emiPayStatusIds[name] = row.id;
  }

  summary("Loan Product Types", LOAN_PRODUCT_TYPES.length);
  summary("Application Statuses", APPLICATION_STATUSES.length);
  summary("Loan Statuses", LOAN_STATUSES.length);
  summary("EMI Pay Statuses", EMI_PAY_STATUSES.length);

  return { loanProductTypeIds, applicationStatusIds, loanStatusIds, emiPayStatusIds };
}
