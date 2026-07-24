import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Loan Management lifecycle (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createBank: (typeof import("@/modules/banks"))["createBank"];
  let createCommissionPolicy: (typeof import("@/modules/banks"))["createCommissionPolicy"];
  let publishCommissionPolicy: (typeof import("@/modules/banks"))["publishCommissionPolicy"];
  let createLoanProduct: (typeof import("@/modules/loan-products"))["createLoanProduct"];
  let listLoanProductTypes: (typeof import("@/modules/loan-products"))["listLoanProductTypes"];
  let createCustomer: (typeof import("@/modules/customers"))["createCustomer"];
  let createLead: (typeof import("@/modules/leads"))["createLead"];
  let createEligibilitySnapshot: (typeof import("@/modules/loan-applications"))["createEligibilitySnapshot"];
  let createLoanOffer: (typeof import("@/modules/loan-applications"))["createLoanOffer"];
  let decideLoanOffer: (typeof import("@/modules/loan-applications"))["decideLoanOffer"];
  let submitLoanApplication: (typeof import("@/modules/loan-applications"))["submitLoanApplication"];
  let decideLoanApplication: (typeof import("@/modules/loan-applications"))["decideLoanApplication"];
  let getLoanDashboard: (typeof import("@/modules/loan-applications"))["getLoanDashboard"];
  let recordDisbursement: (typeof import("@/modules/disbursements"))["recordDisbursement"];
  let updateCommissionStatus: (typeof import("@/modules/disbursements"))["updateCommissionStatus"];
  let getLoanAccount: (typeof import("@/modules/loan-accounts"))["getLoanAccount"];

  let organizationId: string;
  let userId: string;
  let bankId: string;
  let productId: string;
  let customerId: string;
  let leadId: string;
  let applicationId: string;
  let accountId: string;
  let disbursementId: string;
  let commissionId: string;

  beforeAll(async () => {
    const db = await import("@/infra/db/client");
    const banks = await import("@/modules/banks");
    const products = await import("@/modules/loan-products");
    const customers = await import("@/modules/customers");
    const leads = await import("@/modules/leads");
    const apps = await import("@/modules/loan-applications");
    const disbursements = await import("@/modules/disbursements");
    const accounts = await import("@/modules/loan-accounts");

    prisma = db.prisma;
    createBank = banks.createBank;
    createCommissionPolicy = banks.createCommissionPolicy;
    publishCommissionPolicy = banks.publishCommissionPolicy;
    createLoanProduct = products.createLoanProduct;
    listLoanProductTypes = products.listLoanProductTypes;
    createCustomer = customers.createCustomer;
    createLead = leads.createLead;
    createEligibilitySnapshot = apps.createEligibilitySnapshot;
    createLoanOffer = apps.createLoanOffer;
    decideLoanOffer = apps.decideLoanOffer;
    submitLoanApplication = apps.submitLoanApplication;
    decideLoanApplication = apps.decideLoanApplication;
    getLoanDashboard = apps.getLoanDashboard;
    recordDisbursement = disbursements.recordDisbursement;
    updateCommissionStatus = disbursements.updateCommissionStatus;
    getLoanAccount = accounts.getLoanAccount;

    const organization = await prisma.organization.upsert({
      where: { code: "MUDRAX" },
      update: {},
      create: {
        name: "Mudrax Capitals",
        code: "MUDRAX",
        status: "ACTIVE",
        timezone: "Asia/Kolkata",
      },
    });
    organizationId = organization.id;

    // Ensure catalogs exist
    await prisma.loanProductType.upsert({
      where: { organizationId_name: { organizationId, name: "Personal Loan" } },
      update: {},
      create: { organizationId, name: "Personal Loan" },
    });
    const statuses = [
      ["Draft", "DRAFT", false, 1],
      ["Submitted", "SUBMITTED", false, 2],
      ["Approved", "APPROVED", false, 4],
      ["Rejected", "REJECTED", true, 7],
      ["Converted to Loan Account", "CONVERTED", true, 6],
    ] as const;
    for (const [name, bucket, isTerminal, sortOrder] of statuses) {
      await prisma.applicationStatus.upsert({
        where: { organizationId_name: { organizationId, name } },
        update: { bucket, isTerminal, sortOrder },
        create: { organizationId, name, bucket, isTerminal, sortOrder },
      });
    }
    await prisma.loanStatus.upsert({
      where: { organizationId_name: { organizationId, name: "Active" } },
      update: {},
      create: { organizationId, name: "Active", isTerminal: false, sortOrder: 1 },
    });
    await prisma.loanStatus.upsert({
      where: { organizationId_name: { organizationId, name: "Closed" } },
      update: {},
      create: { organizationId, name: "Closed", isTerminal: true, sortOrder: 5 },
    });

    const suffix = Date.now().toString().slice(-6);
    const user = await prisma.user.create({
      data: {
        organizationId,
        employeeCode: `INTLN${suffix}`,
        fullName: "Integration Loans User",
        email: `int-loans-${suffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userId = user.id;
  }, 60000);

  afterAll(async () => {
    if (commissionId) {
      await prisma.commission.deleteMany({ where: { id: commissionId } }).catch(() => undefined);
    }
    if (disbursementId) {
      await prisma.disbursement.deleteMany({ where: { id: disbursementId } }).catch(() => undefined);
    }
    if (accountId) {
      await prisma.loanAccount.deleteMany({ where: { id: accountId } }).catch(() => undefined);
    }
    if (applicationId) {
      await prisma.loanApplication.deleteMany({ where: { id: applicationId } }).catch(() => undefined);
    }
  });

  it("runs offer → application → approval → disbursement → account → commission", async () => {
    const actor = { actorType: "USER" as const, actorId: userId };
    const suffix = Date.now().toString().slice(-4);

    const bank = await createBank({
      organizationId,
      input: { name: `Loan Int Bank ${suffix}`, code: `LIB${suffix}`, status: "ACTIVE" },
      actor,
    });
    bankId = bank.id;

    const policy = await createCommissionPolicy({
      bankId,
      organizationId,
      input: { ratePercent: 2 },
      actor,
    });
    await publishCommissionPolicy({ policyId: policy.id, organizationId, actor });

    const types = await listLoanProductTypes(organizationId);
    const productType = types[0];
    expect(productType).toBeTruthy();

    const product = await createLoanProduct({
      organizationId,
      input: {
        bankId,
        loanProductTypeId: productType!.id,
        variant: `Std${suffix}`,
        name: `Test PL ${suffix}`,
        status: "ACTIVE",
        minInterestRate: "10.5",
        maxInterestRate: "18",
        minTenureMonths: 12,
        maxTenureMonths: 60,
        minLoanAmount: "50000",
        maxLoanAmount: "2000000",
      },
      actor,
    });
    productId = product.id;

    const customer = await createCustomer({
      organizationId,
      input: {
        fullName: `Loan Int Customer ${suffix}`,
        identifiers: [{ type: "PHONE", value: `+9198${Date.now().toString().slice(-8)}` }],
      },
      actor: { actorType: "USER", actorId: null },
    });
    customerId = customer.id;

    // Lead creation needs catalogs — use seeded or create minimal
    const source = await prisma.leadSource.upsert({
      where: { organizationId_name: { organizationId, name: "Website" } },
      update: {},
      create: { organizationId, name: "Website" },
    });
    const stage = await prisma.leadStage.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    expect(stage).toBeTruthy();

    const lead = await createLead({
      organizationId,
      input: {
        customerId,
        leadSourceId: source.id,
        currentStageId: stage!.id,
        fullNameSnapshot: `Loan Int Customer ${suffix}`,
      },
      actor,
    });
    leadId = lead.id;

    const eligibility = await createEligibilitySnapshot({
      organizationId,
      input: {
        customerId,
        method: "MANUAL",
        monthlyIncome: "100000",
        decision: "ELIGIBLE",
        maxEligibleAmount: "800000",
      },
      actor,
    });

    const offer = await createLoanOffer({
      organizationId,
      input: {
        leadId,
        eligibilitySnapshotId: eligibility.id,
        bankId,
        loanProductId: productId,
        offeredAmount: "500000",
        offeredInterestRate: "12.5",
        offeredTenureMonths: 36,
      },
      actor,
    });

    const decided = await decideLoanOffer({
      offerId: offer.id,
      organizationId,
      input: { decision: "ACCEPT" },
      actor,
    });
    expect(decided.application).toBeTruthy();
    applicationId = decided.application!.id;

    await submitLoanApplication({ applicationId, organizationId, actor });
    const approved = await decideLoanApplication({
      applicationId,
      organizationId,
      input: { decision: "APPROVE" },
      actor,
    });
    expect(approved.applicationStatusBucket).toBe("APPROVED");

    const disbursement = await recordDisbursement({
      organizationId,
      input: {
        loanApplicationId: applicationId,
        bankReferenceNumber: `REF-${suffix}-${Date.now()}`,
        amount: "500000",
        markDisbursed: true,
      },
      actor,
    });
    disbursementId = disbursement.id;
    expect(disbursement.loanAccountId).toBeTruthy();
    accountId = disbursement.loanAccountId!;
    expect(disbursement.commission?.status).toBe("ACCRUED");
    commissionId = disbursement.commission!.id;

    const account = await getLoanAccount(accountId, organizationId);
    expect(account.accountNumber.startsWith("LA-")).toBe(true);
    expect(account.sanctionedAmount).toBe("500000");

    const invoiced = await updateCommissionStatus({
      commissionId,
      organizationId,
      input: { status: "INVOICED" },
      actor,
    });
    expect(invoiced.status).toBe("INVOICED");

    const received = await updateCommissionStatus({
      commissionId,
      organizationId,
      input: { status: "RECEIVED" },
      actor,
    });
    expect(received.receivedAmount).toBe(received.expectedAmount);

    const dashboard = await getLoanDashboard(organizationId);
    expect(dashboard.approved).toBeGreaterThanOrEqual(1);
    expect(Number(dashboard.totalDisbursedAmount)).toBeGreaterThan(0);
  }, 120000);
});
