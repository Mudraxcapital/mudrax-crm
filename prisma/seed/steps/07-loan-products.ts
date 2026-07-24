// ============================================================================
// prisma/seed/steps/07-loan-products.ts
//
// Seeds realistic demo data (requirement #5) for `loan_products.LoanProduct`
// — concrete lending products, each belonging to exactly one Bank by
// identity (loan-products.md: "Bank offers Loan Products," never "owns").
// Runs after 05-loan-catalogs (Loan Product Type) and 06-banks (Bank).
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { LoanProductStatus } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

interface LoanProductSeed {
  bank: string;
  productType: string;
  variant: string;
  name: string;
  minRate: string;
  maxRate: string;
  minTenure: number;
  maxTenure: number;
  minAmount: string;
  maxAmount: string;
}

const LOAN_PRODUCTS: LoanProductSeed[] = [
  {
    bank: "HDFC",
    productType: "Personal Loan",
    variant: "Standard",
    name: "HDFC Personal Loan",
    minRate: "10.500",
    maxRate: "18.000",
    minTenure: 12,
    maxTenure: 60,
    minAmount: "50000",
    maxAmount: "4000000",
  },
  {
    bank: "HDFC",
    productType: "Home Loan",
    variant: "Standard",
    name: "HDFC Home Loan",
    minRate: "8.500",
    maxRate: "10.500",
    minTenure: 60,
    maxTenure: 360,
    minAmount: "500000",
    maxAmount: "50000000",
  },
  {
    bank: "ICICI",
    productType: "Personal Loan",
    variant: "Standard",
    name: "ICICI Personal Loan",
    minRate: "10.750",
    maxRate: "19.000",
    minTenure: 12,
    maxTenure: 60,
    minAmount: "50000",
    maxAmount: "3000000",
  },
  {
    bank: "ICICI",
    productType: "Car Loan",
    variant: "Standard",
    name: "ICICI Car Loan",
    minRate: "8.900",
    maxRate: "12.500",
    minTenure: 12,
    maxTenure: 84,
    minAmount: "100000",
    maxAmount: "10000000",
  },
  {
    bank: "SBI",
    productType: "Loan Against Property",
    variant: "Standard",
    name: "SBI Loan Against Property",
    minRate: "9.500",
    maxRate: "12.000",
    minTenure: 60,
    maxTenure: 180,
    minAmount: "1000000",
    maxAmount: "50000000",
  },
  {
    bank: "SBI",
    productType: "Business Loan",
    variant: "Standard",
    name: "SBI Business Loan",
    minRate: "11.000",
    maxRate: "16.500",
    minTenure: 12,
    maxTenure: 120,
    minAmount: "200000",
    maxAmount: "20000000",
  },
];

export async function seedLoanProducts(
  prisma: PrismaClient,
  organizationId: string,
  bankIds: Record<string, string>,
  loanProductTypeIds: Record<string, string>,
): Promise<Record<string, string>> {
  section("7. Loan Products (demo lending catalog)");

  explain(
    "Six concrete Loan Products spanning the five Loan Product Types, split across the three demo Banks — realistic enough to drive demo Loan Applications.",
  );
  const loanProductIds: Record<string, string> = {};
  for (const product of LOAN_PRODUCTS) {
    const bankId = bankIds[product.bank];
    const loanProductTypeId = loanProductTypeIds[product.productType];
    if (!bankId || !loanProductTypeId) continue;

    const row = await prisma.loanProduct.upsert({
      where: {
        bankId_loanProductTypeId_variant: { bankId, loanProductTypeId, variant: product.variant },
      },
      update: {
        name: product.name,
        status: LoanProductStatus.ACTIVE,
        minInterestRate: product.minRate,
        maxInterestRate: product.maxRate,
        minTenureMonths: product.minTenure,
        maxTenureMonths: product.maxTenure,
        minLoanAmount: product.minAmount,
        maxLoanAmount: product.maxAmount,
      },
      create: {
        organizationId,
        bankId,
        loanProductTypeId,
        variant: product.variant,
        name: product.name,
        status: LoanProductStatus.ACTIVE,
        minInterestRate: product.minRate,
        maxInterestRate: product.maxRate,
        minTenureMonths: product.minTenure,
        maxTenureMonths: product.maxTenure,
        minLoanAmount: product.minAmount,
        maxLoanAmount: product.maxAmount,
      },
    });
    loanProductIds[product.name] = row.id;
  }

  summary("Loan Products", Object.keys(loanProductIds).length);
  return loanProductIds;
}
