import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateLoanProductData,
  ListLoanProductsFilter,
  LoanProductRepository,
  UpdateLoanProductData,
} from "../../domain/repositories/LoanProductRepository";
import type { LoanProduct, LoanProductType } from "../../domain/entities/LoanProduct";
import type {
  LoanProductsAuditActor,
  LoanProductsAuditRecord,
} from "../../domain/entities/LoanProductsAuditRecord";
import {
  toLoanProduct,
  toLoanProductType,
  toLoanProductsAuditRecord,
} from "../mappers/loanProductsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(product: LoanProduct): Prisma.InputJsonValue {
  return {
    id: product.id,
    bankId: product.bankId,
    name: product.name,
    status: product.status,
    variant: product.variant,
  };
}

export class PrismaLoanProductRepository implements LoanProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<LoanProduct | null> {
    const row = await this.prisma.loanProduct.findUnique({ where: { id } });
    return row ? toLoanProduct(row) : null;
  }

  async findByBankTypeVariant(
    bankId: string,
    loanProductTypeId: string,
    variant: string,
  ): Promise<LoanProduct | null> {
    const row = await this.prisma.loanProduct.findUnique({
      where: { bankId_loanProductTypeId_variant: { bankId, loanProductTypeId, variant } },
    });
    return row ? toLoanProduct(row) : null;
  }

  async list(organizationId: string, filter?: ListLoanProductsFilter): Promise<LoanProduct[]> {
    const rows = await this.prisma.loanProduct.findMany({
      where: {
        organizationId,
        ...(filter?.bankId ? { bankId: filter.bankId } : {}),
        ...(filter?.status ? { status: filter.status } : {}),
      },
      orderBy: { name: "asc" },
      take: filter?.limit ?? 100,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toLoanProduct);
  }

  async createWithAudit(
    data: CreateLoanProductData,
    actor: LoanProductsAuditActor,
    correlationId?: string | null,
  ): Promise<LoanProduct> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.loanProduct.create({
        data: {
          organizationId: data.organizationId,
          bankId: data.bankId,
          loanProductTypeId: data.loanProductTypeId,
          variant: data.variant,
          name: data.name,
          status: data.status ?? "DRAFT",
          minInterestRate: data.minInterestRate,
          maxInterestRate: data.maxInterestRate,
          minTenureMonths: data.minTenureMonths,
          maxTenureMonths: data.maxTenureMonths,
          minLoanAmount: data.minLoanAmount,
          maxLoanAmount: data.maxLoanAmount,
          eligibilityRules: (data.eligibilityRules ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
      const product = toLoanProduct(row);
      await tx.loanProductAuditLog.create({
        data: {
          organizationId: data.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LoanProductCreated",
          targetType: "LoanProduct",
          targetId: product.id,
          correlationId: correlationId ?? null,
          afterState: toAuditJson(product),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return product;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateLoanProductData,
    actor: LoanProductsAuditActor,
    correlationId?: string | null,
  ): Promise<LoanProduct> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.loanProduct.findUniqueOrThrow({ where: { id } });
      const before = toLoanProduct(beforeRow);
      const row = await tx.loanProduct.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.minInterestRate !== undefined ? { minInterestRate: data.minInterestRate } : {}),
          ...(data.maxInterestRate !== undefined ? { maxInterestRate: data.maxInterestRate } : {}),
          ...(data.minTenureMonths !== undefined ? { minTenureMonths: data.minTenureMonths } : {}),
          ...(data.maxTenureMonths !== undefined ? { maxTenureMonths: data.maxTenureMonths } : {}),
          ...(data.minLoanAmount !== undefined ? { minLoanAmount: data.minLoanAmount } : {}),
          ...(data.maxLoanAmount !== undefined ? { maxLoanAmount: data.maxLoanAmount } : {}),
          ...(data.eligibilityRules !== undefined
            ? { eligibilityRules: (data.eligibilityRules ?? undefined) as Prisma.InputJsonValue | undefined }
            : {}),
        },
      });
      const product = toLoanProduct(row);
      await tx.loanProductAuditLog.create({
        data: {
          organizationId: product.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LoanProductUpdated",
          targetType: "LoanProduct",
          targetId: product.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(product),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return product;
    });
  }

  async listProductTypes(organizationId: string): Promise<LoanProductType[]> {
    const rows = await this.prisma.loanProductType.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
    });
    return rows.map(toLoanProductType);
  }

  async findProductTypeById(id: string): Promise<LoanProductType | null> {
    const row = await this.prisma.loanProductType.findUnique({ where: { id } });
    return row ? toLoanProductType(row) : null;
  }

  async listAuditLog(targetId: string): Promise<LoanProductsAuditRecord[]> {
    const rows = await this.prisma.loanProductAuditLog.findMany({
      where: { targetId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toLoanProductsAuditRecord);
  }
}
