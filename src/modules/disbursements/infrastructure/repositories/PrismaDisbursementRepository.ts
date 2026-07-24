import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateCommissionData,
  CreateDisbursementData,
  DisbursementRepository,
} from "../../domain/repositories/DisbursementRepository";
import type { Disbursement, DisbursementStatus } from "../../domain/entities/Disbursement";
import type { CommissionStatus } from "../../domain/entities/Commission";
import type { DisbursementsAuditActor, DisbursementsAuditRecord } from "../../domain/entities/DisbursementsAuditRecord";
import { toCommission, toDisbursement, toDisbursementsAuditRecord } from "../mappers/disbursementsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaDisbursementRepository implements DisbursementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    const row = await this.prisma.disbursement.findUnique({ where: { id } });
    return row ? toDisbursement(row) : null;
  }

  async findByBankReference(bankId: string, bankReferenceNumber: string) {
    const row = await this.prisma.disbursement.findUnique({
      where: { bankId_bankReferenceNumber: { bankId, bankReferenceNumber } },
    });
    return row ? toDisbursement(row) : null;
  }

  async listByApplication(loanApplicationId: string) {
    const rows = await this.prisma.disbursement.findMany({
      where: { loanApplicationId },
      orderBy: { trancheNumber: "asc" },
    });
    return rows.map(toDisbursement);
  }

  async list(organizationId: string, filter?: { status?: DisbursementStatus; limit?: number; offset?: number }) {
    const rows = await this.prisma.disbursement.findMany({
      where: {
        organizationId,
        ...(filter?.status ? { status: filter.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: filter?.limit ?? 100,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toDisbursement);
  }

  async nextTrancheNumber(loanApplicationId: string) {
    const latest = await this.prisma.disbursement.findFirst({
      where: { loanApplicationId },
      orderBy: { trancheNumber: "desc" },
    });
    return (latest?.trancheNumber ?? 0) + 1;
  }

  async createWithAudit(data: CreateDisbursementData, actor: DisbursementsAuditActor, correlationId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.disbursement.create({
        data: {
          organizationId: data.organizationId,
          loanApplicationId: data.loanApplicationId,
          loanAccountId: data.loanAccountId ?? null,
          bankId: data.bankId,
          bankReferenceNumber: data.bankReferenceNumber,
          amount: data.amount,
          trancheNumber: data.trancheNumber,
          scheduledAt: data.scheduledAt ?? null,
          status: data.status ?? "SCHEDULED_EXPECTED",
          disbursedAt: data.status === "DISBURSED" ? new Date() : null,
        },
      });
      const d = toDisbursement(row);
      await tx.disbursementAuditLog.create({
        data: {
          organizationId: data.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DisbursementRecorded",
          targetType: "Disbursement",
          targetId: d.id,
          correlationId: correlationId ?? null,
          afterState: { id: d.id, amount: d.amount, status: d.status, tranche: d.trancheNumber },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return d;
    });
  }

  async updateStatusWithAudit(
    id: string,
    status: DisbursementStatus,
    actor: DisbursementsAuditActor,
    extras?: Partial<Pick<Disbursement, "loanAccountId" | "disbursedAt" | "reconciledAt" | "reversedAt" | "reversalReason">>,
    correlationId?: string | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.disbursement.findUniqueOrThrow({ where: { id } });
      const before = toDisbursement(beforeRow);
      const row = await tx.disbursement.update({
        where: { id },
        data: {
          status,
          ...(extras?.loanAccountId !== undefined ? { loanAccountId: extras.loanAccountId } : {}),
          ...(extras?.disbursedAt !== undefined ? { disbursedAt: extras.disbursedAt } : {}),
          ...(extras?.reconciledAt !== undefined ? { reconciledAt: extras.reconciledAt } : {}),
          ...(extras?.reversedAt !== undefined ? { reversedAt: extras.reversedAt } : {}),
          ...(extras?.reversalReason !== undefined ? { reversalReason: extras.reversalReason } : {}),
        },
      });
      const d = toDisbursement(row);
      await tx.disbursementAuditLog.create({
        data: {
          organizationId: d.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DisbursementStatusChanged",
          targetType: "Disbursement",
          targetId: d.id,
          correlationId: correlationId ?? null,
          beforeState: { status: before.status },
          afterState: { status: d.status },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return d;
    });
  }

  async createCommissionWithAudit(
    organizationId: string,
    data: CreateCommissionData,
    actor: DisbursementsAuditActor,
    correlationId?: string | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.commission.create({
        data: {
          disbursementId: data.disbursementId,
          commissionPolicyVersionId: data.commissionPolicyVersionId,
          status: "ACCRUED",
          rateSnapshot: data.rateSnapshot as Prisma.InputJsonValue,
          computedAmount: data.computedAmount,
          clawbackRuleSnapshot: data.clawbackRuleSnapshot as Prisma.InputJsonValue,
        },
      });
      const c = toCommission(row);
      await tx.disbursementAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CommissionAccrued",
          targetType: "Commission",
          targetId: c.id,
          correlationId: correlationId ?? null,
          afterState: { id: c.id, amount: c.computedAmount, status: c.status },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return c;
    });
  }

  async findCommissionByDisbursementId(disbursementId: string) {
    const row = await this.prisma.commission.findUnique({ where: { disbursementId } });
    return row ? toCommission(row) : null;
  }

  async findCommissionById(id: string) {
    const row = await this.prisma.commission.findUnique({ where: { id } });
    return row ? toCommission(row) : null;
  }

  async listCommissions(organizationId: string, filter?: { status?: CommissionStatus; limit?: number }) {
    const rows = await this.prisma.commission.findMany({
      where: {
        disbursement: { organizationId },
        ...(filter?.status ? { status: filter.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: filter?.limit ?? 100,
    });
    return rows.map(toCommission);
  }

  async updateCommissionStatusWithAudit(
    id: string,
    status: CommissionStatus,
    organizationId: string,
    actor: DisbursementsAuditActor,
    correlationId?: string | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.commission.findUniqueOrThrow({ where: { id } });
      const before = toCommission(beforeRow);
      const row = await tx.commission.update({
        where: { id },
        data: {
          status,
          ...(status === "INVOICED" ? { invoicedAt: new Date() } : {}),
          ...(status === "RECEIVED" ? { receivedAt: new Date() } : {}),
          ...(status === "RECONCILED" ? { reconciledAt: new Date() } : {}),
        },
      });
      const c = toCommission(row);
      await tx.disbursementAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CommissionStatusChanged",
          targetType: "Commission",
          targetId: c.id,
          correlationId: correlationId ?? null,
          beforeState: { status: before.status },
          afterState: { status: c.status },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return c;
    });
  }

  async listAuditLog(targetId: string): Promise<DisbursementsAuditRecord[]> {
    const rows = await this.prisma.disbursementAuditLog.findMany({
      where: { targetId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toDisbursementsAuditRecord);
  }
}
