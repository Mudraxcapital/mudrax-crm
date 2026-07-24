import type {
  LoanProduct as PrismaLoanProduct,
  LoanProductType as PrismaLoanProductType,
  LoanProductAuditLog as PrismaLoanProductAuditLog,
  Prisma,
} from "@prisma/client";
import type { LoanProduct, LoanProductType } from "../../domain/entities/LoanProduct";
import type { LoanProductsAuditRecord } from "../../domain/entities/LoanProductsAuditRecord";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function decimalToString(value: Prisma.Decimal | string | number): string {
  return value.toString();
}

export function toLoanProduct(row: PrismaLoanProduct): LoanProduct {
  return {
    id: row.id,
    organizationId: row.organizationId,
    bankId: row.bankId,
    loanProductTypeId: row.loanProductTypeId,
    variant: row.variant,
    name: row.name,
    status: row.status,
    minInterestRate: decimalToString(row.minInterestRate),
    maxInterestRate: decimalToString(row.maxInterestRate),
    minTenureMonths: row.minTenureMonths,
    maxTenureMonths: row.maxTenureMonths,
    minLoanAmount: decimalToString(row.minLoanAmount),
    maxLoanAmount: decimalToString(row.maxLoanAmount),
    eligibilityRules: asRecord(row.eligibilityRules),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toLoanProductType(row: PrismaLoanProductType): LoanProductType {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toLoanProductsAuditRecord(row: PrismaLoanProductAuditLog): LoanProductsAuditRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    occurredAt: row.occurredAt,
    actorType: row.actorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    beforeState: asRecord(row.beforeState),
    afterState: asRecord(row.afterState),
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}
