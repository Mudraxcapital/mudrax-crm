import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateEligibilityData,
  CreateLoanApplicationData,
  CreateLoanOfferData,
  ListLoanApplicationsFilter,
  LoanApplicationRepository,
  UpdateLoanApplicationData,
} from "../../domain/repositories/LoanApplicationRepository";
import type { LoanOfferStatus } from "../../domain/entities/LoanOffer";
import type { LoanApplicationsAuditActor, LoanApplicationsAuditRecord } from "../../domain/entities/LoanApplicationsAuditRecord";
import {
  appAuditJson,
  toApplicationStatus,
  toEligibilitySnapshot,
  toLoanApplication,
  toLoanApplicationsAuditRecord,
  toLoanOffer,
} from "../mappers/loanApplicationsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaLoanApplicationRepository implements LoanApplicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    const row = await this.prisma.loanApplication.findUnique({ where: { id } });
    return row ? toLoanApplication(row) : null;
  }

  async list(organizationId: string, filter?: ListLoanApplicationsFilter) {
    const statusFilter = filter?.statusBucket
      ? { applicationStatus: { bucket: filter.statusBucket as never } }
      : {};
    const rows = await this.prisma.loanApplication.findMany({
      where: {
        organizationId,
        ...(filter?.customerId ? { customerId: filter.customerId } : {}),
        ...(filter?.leadId ? { leadId: filter.leadId } : {}),
        ...statusFilter,
      },
      orderBy: { createdAt: "desc" },
      take: filter?.limit ?? 100,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toLoanApplication);
  }

  async createWithAudit(data: CreateLoanApplicationData, actor: LoanApplicationsAuditActor, correlationId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.loanApplication.create({
        data: {
          organizationId: data.organizationId,
          customerId: data.customerId,
          leadId: data.leadId,
          loanProductId: data.loanProductId,
          bankBranchId: data.bankBranchId ?? null,
          applicationStatusId: data.applicationStatusId,
          loanOfferId: data.loanOfferId ?? null,
          applicationType: data.applicationType ?? "STANDARD",
          originatingLoanAccountId: data.originatingLoanAccountId ?? null,
          externalLoanReference: (data.externalLoanReference ?? undefined) as Prisma.InputJsonValue | undefined,
          requestedAmount: data.requestedAmount,
          requestedTenureMonths: data.requestedTenureMonths,
          createdByUserId: data.createdByUserId,
        },
      });
      const app = toLoanApplication(row);
      await tx.loanApplicationAuditLog.create({
        data: {
          organizationId: data.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LoanApplicationCreated",
          targetType: "LoanApplication",
          targetId: app.id,
          correlationId: correlationId ?? null,
          afterState: appAuditJson(app),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return app;
    });
  }

  async updateWithAudit(id: string, data: UpdateLoanApplicationData, actor: LoanApplicationsAuditActor, correlationId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.loanApplication.findUniqueOrThrow({ where: { id } });
      const before = toLoanApplication(beforeRow);
      const row = await tx.loanApplication.update({
        where: { id },
        data: {
          ...(data.applicationStatusId !== undefined ? { applicationStatusId: data.applicationStatusId } : {}),
          ...(data.bankBranchId !== undefined ? { bankBranchId: data.bankBranchId } : {}),
          ...(data.requestedAmount !== undefined ? { requestedAmount: data.requestedAmount } : {}),
          ...(data.requestedTenureMonths !== undefined ? { requestedTenureMonths: data.requestedTenureMonths } : {}),
          ...(data.submittedAt !== undefined ? { submittedAt: data.submittedAt } : {}),
          ...(data.decisionAt !== undefined ? { decisionAt: data.decisionAt } : {}),
          ...(data.decidedByUserId !== undefined ? { decidedByUserId: data.decidedByUserId } : {}),
          ...(data.rejectionReason !== undefined ? { rejectionReason: data.rejectionReason } : {}),
          ...(data.withdrawnAt !== undefined ? { withdrawnAt: data.withdrawnAt } : {}),
          ...(data.loanOfferId !== undefined ? { loanOfferId: data.loanOfferId } : {}),
        },
      });
      const app = toLoanApplication(row);
      await tx.loanApplicationAuditLog.create({
        data: {
          organizationId: app.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LoanApplicationUpdated",
          targetType: "LoanApplication",
          targetId: app.id,
          correlationId: correlationId ?? null,
          beforeState: appAuditJson(before),
          afterState: appAuditJson(app),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return app;
    });
  }

  async findStatusById(id: string) {
    const row = await this.prisma.applicationStatus.findUnique({ where: { id } });
    return row ? toApplicationStatus(row) : null;
  }

  async findStatusByBucket(organizationId: string, bucket: string) {
    const row = await this.prisma.applicationStatus.findFirst({
      where: { organizationId, bucket: bucket as never, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return row ? toApplicationStatus(row) : null;
  }

  async listStatuses(organizationId: string) {
    const rows = await this.prisma.applicationStatus.findMany({
      where: { organizationId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toApplicationStatus);
  }

  async createEligibilityWithAudit(organizationId: string, data: CreateEligibilityData, actor: LoanApplicationsAuditActor, correlationId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.eligibilitySnapshot.create({
        data: {
          loanApplicationId: data.loanApplicationId ?? null,
          customerId: data.customerId,
          method: data.method,
          inputsSnapshot: data.inputsSnapshot as Prisma.InputJsonValue,
          decision: data.decision,
          computedCeilings: data.computedCeilings as Prisma.InputJsonValue,
          computedByUserId: data.computedByUserId ?? null,
        },
      });
      const snapshot = toEligibilitySnapshot(row);
      await tx.loanApplicationAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "EligibilitySnapshotCreated",
          targetType: "EligibilitySnapshot",
          targetId: snapshot.id,
          correlationId: correlationId ?? null,
          afterState: { id: snapshot.id, decision: snapshot.decision, method: snapshot.method },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return snapshot;
    });
  }

  async findEligibilityById(id: string) {
    const row = await this.prisma.eligibilitySnapshot.findUnique({ where: { id } });
    return row ? toEligibilitySnapshot(row) : null;
  }

  async createOfferWithAudit(data: CreateLoanOfferData, actor: LoanApplicationsAuditActor, correlationId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.loanOffer.create({
        data: {
          organizationId: data.organizationId,
          leadId: data.leadId,
          eligibilitySnapshotId: data.eligibilitySnapshotId,
          bankId: data.bankId,
          loanProductId: data.loanProductId,
          offeredAmount: data.offeredAmount,
          offeredInterestRate: data.offeredInterestRate,
          offeredTenureMonths: data.offeredTenureMonths,
          expiresAt: data.expiresAt ?? null,
          status: "GENERATED",
        },
      });
      const offer = toLoanOffer(row);
      await tx.loanApplicationAuditLog.create({
        data: {
          organizationId: data.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LoanOfferCreated",
          targetType: "LoanOffer",
          targetId: offer.id,
          correlationId: correlationId ?? null,
          afterState: { id: offer.id, status: offer.status, amount: offer.offeredAmount },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return offer;
    });
  }

  async findOfferById(id: string) {
    const row = await this.prisma.loanOffer.findUnique({ where: { id } });
    return row ? toLoanOffer(row) : null;
  }

  async listOffersByLead(organizationId: string, leadId: string) {
    const rows = await this.prisma.loanOffer.findMany({
      where: { organizationId, leadId },
      orderBy: { generatedAt: "desc" },
    });
    return rows.map(toLoanOffer);
  }

  async updateOfferStatusWithAudit(
    id: string,
    status: LoanOfferStatus,
    organizationId: string,
    actor: LoanApplicationsAuditActor,
    extras?: { presentedAt?: Date; decidedAt?: Date },
    correlationId?: string | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.loanOffer.findUniqueOrThrow({ where: { id } });
      const before = toLoanOffer(beforeRow);
      const row = await tx.loanOffer.update({
        where: { id },
        data: {
          status,
          ...(extras?.presentedAt ? { presentedAt: extras.presentedAt } : {}),
          ...(extras?.decidedAt ? { decidedAt: extras.decidedAt } : {}),
        },
      });
      const offer = toLoanOffer(row);
      await tx.loanApplicationAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LoanOfferStatusChanged",
          targetType: "LoanOffer",
          targetId: offer.id,
          correlationId: correlationId ?? null,
          beforeState: { status: before.status },
          afterState: { status: offer.status },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return offer;
    });
  }

  async countByStatusBucket(organizationId: string) {
    const rows = await this.prisma.loanApplication.groupBy({
      by: ["applicationStatusId"],
      where: { organizationId },
      _count: { _all: true },
    });
    const statuses = await this.listStatuses(organizationId);
    const byId = new Map(statuses.map((s) => [s.id, s.bucket]));
    const result: Record<string, number> = {};
    for (const row of rows) {
      const bucket = byId.get(row.applicationStatusId) ?? "UNKNOWN";
      result[bucket] = (result[bucket] ?? 0) + row._count._all;
    }
    return result;
  }

  async listAuditLog(targetId: string): Promise<LoanApplicationsAuditRecord[]> {
    const rows = await this.prisma.loanApplicationAuditLog.findMany({
      where: { targetId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toLoanApplicationsAuditRecord);
  }
}
