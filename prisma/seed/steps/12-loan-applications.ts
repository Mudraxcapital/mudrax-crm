// ============================================================================
// prisma/seed/steps/12-loan-applications.ts
//
// Seeds realistic demo data (requirement #5) for `loan_applications`: four
// Loan Applications tracing back to the demo Leads/Customers already
// seeded, spread across the Application Status pipeline seeded in
// 05-loan-catalogs.ts, so the loan lifecycle isn't just catalogs with
// nothing flowing through them.
//
// LoanApplication has no natural business unique key, so its id is derived
// with `seedId()` for idempotency.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { seedId } from "../lib/determinism";
import { explain, section, summary } from "../lib/logger";
import type { CustomerSeedResult } from "./09-customers";
import type { LeadSeedResult } from "./10-leads";
import type { LoanCatalogSeedResult } from "./05-loan-catalogs";

interface LoanApplicationSeed {
  key: string;
  customerKey: string;
  leadKey: string;
  loanProductName: string;
  applicationStatus: string;
  requestedAmount: string;
  requestedTenureMonths: number;
  submitted?: boolean;
  decided?: boolean;
}

const LOAN_APPLICATIONS: LoanApplicationSeed[] = [
  {
    key: "amit-verma-personal-loan",
    customerKey: "amit-verma",
    leadKey: "amit-verma",
    loanProductName: "HDFC Personal Loan",
    applicationStatus: "Draft",
    requestedAmount: "500000",
    requestedTenureMonths: 36,
  },
  {
    key: "vikram-singh-lap",
    customerKey: "vikram-singh",
    leadKey: "vikram-singh",
    loanProductName: "SBI Loan Against Property",
    applicationStatus: "Submitted",
    requestedAmount: "5000000",
    requestedTenureMonths: 120,
    submitted: true,
  },
  {
    key: "anjali-nair-car-loan",
    customerKey: "anjali-nair",
    leadKey: "anjali-nair",
    loanProductName: "ICICI Car Loan",
    applicationStatus: "Under Bank Review",
    requestedAmount: "1200000",
    requestedTenureMonths: 60,
    submitted: true,
  },
  {
    key: "rajesh-kumar-business-loan",
    customerKey: "rajesh-kumar",
    leadKey: "rajesh-kumar",
    loanProductName: "SBI Business Loan",
    applicationStatus: "Approved",
    requestedAmount: "2000000",
    requestedTenureMonths: 84,
    submitted: true,
    decided: true,
  },
];

export async function seedLoanApplications(
  prisma: PrismaClient,
  organizationId: string,
  customers: CustomerSeedResult,
  leads: LeadSeedResult,
  loanProductIds: Record<string, string>,
  catalogs: LoanCatalogSeedResult,
  adminUserId: string,
): Promise<void> {
  section("12. Loan Applications (demo pipeline)");

  explain(
    "Four Loan Applications tracing Customer -> Lead -> Loan Product, spread across Draft / Submitted / Under Bank Review / Approved so the demo shows a real decisioning pipeline, not just empty catalogs.",
  );

  let count = 0;
  for (const application of LOAN_APPLICATIONS) {
    const customerId = customers.customerIds[application.customerKey];
    const leadId = leads.leadIds[application.leadKey];
    const loanProductId = loanProductIds[application.loanProductName];
    const applicationStatusId = catalogs.applicationStatusIds[application.applicationStatus];
    if (!customerId || !leadId || !loanProductId || !applicationStatusId) continue;

    const id = seedId(`loan-application:${application.key}`);
    const now = new Date();

    await prisma.loanApplication.upsert({
      where: { id },
      update: { applicationStatusId },
      create: {
        id,
        organizationId,
        customerId,
        leadId,
        loanProductId,
        applicationStatusId,
        requestedAmount: application.requestedAmount,
        requestedTenureMonths: application.requestedTenureMonths,
        submittedAt: application.submitted ? now : undefined,
        decisionAt: application.decided ? now : undefined,
        decidedByUserId: application.decided ? adminUserId : undefined,
        createdByUserId: adminUserId,
      },
    });
    count += 1;
  }

  summary("Loan Applications", count);
}
