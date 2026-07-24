// ============================================================================
// prisma/seed/steps/06-banks.ts
//
// Seeds requirement #1 (lookup/catalog tables) for the `banks` module: Bank,
// Bank Branch (lending-partner master data), and one Commission Policy
// Version per Bank so `disbursements`-adjacent reporting has something to
// join against in a demo environment.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { BankStatus, BankBranchStatus, CommissionPolicyStatus } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

export interface BankSeedResult {
  bankIds: Record<string, string>;
  bankBranchIds: Record<string, string>;
}

const BANKS = [
  { code: "HDFC", name: "HDFC Bank" },
  { code: "ICICI", name: "ICICI Bank" },
  { code: "SBI", name: "State Bank of India" },
];

const BANK_BRANCHES: { bank: string; code: string; name: string; address: string }[] = [
  {
    bank: "HDFC",
    code: "HDFC-BKC",
    name: "HDFC Bank - BKC",
    address: "Bandra Kurla Complex, Mumbai",
  },
  {
    bank: "ICICI",
    code: "ICICI-ANDHERI",
    name: "ICICI Bank - Andheri",
    address: "Andheri East, Mumbai",
  },
  {
    bank: "SBI",
    code: "SBI-CP",
    name: "SBI - Connaught Place",
    address: "Connaught Place, New Delhi",
  },
];

export async function seedBanks(
  prisma: PrismaClient,
  organizationId: string,
  createdByUserId: string,
): Promise<BankSeedResult> {
  section("6. Lending-partner catalog (Bank, Bank Branch, Commission Policy Version)");

  explain("Three Banks (lending partners) — never hard-deleted master data (banks.md).");
  const bankIds: Record<string, string> = {};
  for (const bank of BANKS) {
    const row = await prisma.bank.upsert({
      where: { organizationId_code: { organizationId, code: bank.code } },
      update: { name: bank.name, status: BankStatus.ACTIVE },
      create: { organizationId, code: bank.code, name: bank.name, status: BankStatus.ACTIVE },
    });
    bankIds[bank.code] = row.id;
  }

  explain("One operating Bank Branch per Bank, used for loan case login/processing.");
  const bankBranchIds: Record<string, string> = {};
  for (const branch of BANK_BRANCHES) {
    const bankId = bankIds[branch.bank];
    if (!bankId) continue;
    const row = await prisma.bankBranch.upsert({
      where: { bankId_code: { bankId, code: branch.code } },
      update: { name: branch.name, address: branch.address, status: BankBranchStatus.ACTIVE },
      create: {
        bankId,
        code: branch.code,
        name: branch.name,
        address: branch.address,
        status: BankBranchStatus.ACTIVE,
      },
    });
    bankBranchIds[branch.code] = row.id;
  }

  explain(
    "One Effective, org-wide Commission Policy Version per Bank (loanProductId = null applies to every Loan Product of that Bank) — a versioned, immutable ruleset (banks.md), never edited once Effective.",
  );
  let commissionPolicyCount = 0;
  for (const bank of BANKS) {
    const bankId = bankIds[bank.code];
    if (!bankId) continue;
    const existing = await prisma.commissionPolicyVersion.findFirst({
      where: { bankId, loanProductId: null, versionNumber: 1 },
    });
    if (!existing) {
      await prisma.commissionPolicyVersion.create({
        data: {
          bankId,
          loanProductId: null,
          versionNumber: 1,
          status: CommissionPolicyStatus.EFFECTIVE,
          rateStructure: { type: "PERCENTAGE_OF_DISBURSED_AMOUNT", rate: 1.5 },
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
          createdByUserId,
        },
      });
    }
    commissionPolicyCount += 1;
  }

  summary("Banks", BANKS.length);
  summary("Bank Branches", BANK_BRANCHES.length);
  summary("Commission Policy Versions", commissionPolicyCount);

  return { bankIds, bankBranchIds };
}
