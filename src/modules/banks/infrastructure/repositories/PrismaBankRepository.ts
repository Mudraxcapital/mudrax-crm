import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  BankRepository,
  CreateBankBranchData,
  CreateBankData,
  CreateCommissionPolicyData,
  ListBanksFilter,
  UpdateBankBranchData,
  UpdateBankData,
} from "../../domain/repositories/BankRepository";
import type { Bank } from "../../domain/entities/Bank";
import type { BankBranch } from "../../domain/entities/BankBranch";
import type { CommissionPolicyVersion } from "../../domain/entities/CommissionPolicyVersion";
import type {
  BanksAuditActor,
  BanksAuditRecord,
} from "../../domain/entities/BanksAuditRecord";
import {
  toBank,
  toBankBranch,
  toBanksAuditRecord,
  toCommissionPolicyVersion,
} from "../mappers/banksMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toBankAuditJson(bank: Bank): Prisma.InputJsonValue {
  return {
    id: bank.id,
    organizationId: bank.organizationId,
    name: bank.name,
    code: bank.code,
    status: bank.status,
  };
}

function toBranchAuditJson(branch: BankBranch): Prisma.InputJsonValue {
  return {
    id: branch.id,
    bankId: branch.bankId,
    name: branch.name,
    code: branch.code,
    status: branch.status,
  };
}

function toPolicyAuditJson(policy: CommissionPolicyVersion): Prisma.InputJsonValue {
  return {
    id: policy.id,
    bankId: policy.bankId,
    loanProductId: policy.loanProductId,
    versionNumber: policy.versionNumber,
    status: policy.status,
  };
}

export class PrismaBankRepository implements BankRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Bank | null> {
    const row = await this.prisma.bank.findUnique({ where: { id } });
    return row ? toBank(row) : null;
  }

  async findByCode(organizationId: string, code: string): Promise<Bank | null> {
    const row = await this.prisma.bank.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    return row ? toBank(row) : null;
  }

  async findByName(organizationId: string, name: string): Promise<Bank | null> {
    const row = await this.prisma.bank.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    return row ? toBank(row) : null;
  }

  async list(organizationId: string, filter?: ListBanksFilter): Promise<Bank[]> {
    const rows = await this.prisma.bank.findMany({
      where: {
        organizationId,
        ...(filter?.status ? { status: filter.status } : {}),
      },
      orderBy: { name: "asc" },
      take: filter?.limit ?? 100,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toBank);
  }

  async createWithAudit(
    data: CreateBankData,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<Bank> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.bank.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          code: data.code,
          status: data.status ?? "ONBOARDED",
        },
      });
      const bank = toBank(row);
      await tx.bankAuditLog.create({
        data: {
          organizationId: data.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "BankCreated",
          targetType: "Bank",
          targetId: bank.id,
          correlationId: correlationId ?? null,
          afterState: toBankAuditJson(bank),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return bank;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateBankData,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<Bank> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.bank.findUniqueOrThrow({ where: { id } });
      const before = toBank(beforeRow);
      const row = await tx.bank.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.code !== undefined ? { code: data.code } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });
      const bank = toBank(row);
      await tx.bankAuditLog.create({
        data: {
          organizationId: bank.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "BankUpdated",
          targetType: "Bank",
          targetId: bank.id,
          correlationId: correlationId ?? null,
          beforeState: toBankAuditJson(before),
          afterState: toBankAuditJson(bank),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return bank;
    });
  }

  async listAuditLog(targetId: string): Promise<BanksAuditRecord[]> {
    const rows = await this.prisma.bankAuditLog.findMany({
      where: { targetId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toBanksAuditRecord);
  }

  async findBranchById(id: string): Promise<BankBranch | null> {
    const row = await this.prisma.bankBranch.findUnique({ where: { id } });
    return row ? toBankBranch(row) : null;
  }

  async findBranchByCode(bankId: string, code: string): Promise<BankBranch | null> {
    const row = await this.prisma.bankBranch.findUnique({
      where: { bankId_code: { bankId, code } },
    });
    return row ? toBankBranch(row) : null;
  }

  async listBranches(bankId: string): Promise<BankBranch[]> {
    const rows = await this.prisma.bankBranch.findMany({
      where: { bankId },
      orderBy: { name: "asc" },
    });
    return rows.map(toBankBranch);
  }

  async createBranchWithAudit(
    data: CreateBankBranchData,
    organizationId: string,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<BankBranch> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.bankBranch.create({
        data: {
          bankId: data.bankId,
          name: data.name,
          code: data.code,
          address: data.address ?? null,
          status: data.status ?? "ADDED",
        },
      });
      const branch = toBankBranch(row);
      await tx.bankAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "BankBranchCreated",
          targetType: "BankBranch",
          targetId: branch.id,
          correlationId: correlationId ?? null,
          afterState: toBranchAuditJson(branch),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return branch;
    });
  }

  async updateBranchWithAudit(
    id: string,
    data: UpdateBankBranchData,
    organizationId: string,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<BankBranch> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.bankBranch.findUniqueOrThrow({ where: { id } });
      const before = toBankBranch(beforeRow);
      const row = await tx.bankBranch.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.code !== undefined ? { code: data.code } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });
      const branch = toBankBranch(row);
      await tx.bankAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "BankBranchUpdated",
          targetType: "BankBranch",
          targetId: branch.id,
          correlationId: correlationId ?? null,
          beforeState: toBranchAuditJson(before),
          afterState: toBranchAuditJson(branch),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return branch;
    });
  }

  async findPolicyById(id: string): Promise<CommissionPolicyVersion | null> {
    const row = await this.prisma.commissionPolicyVersion.findUnique({ where: { id } });
    return row ? toCommissionPolicyVersion(row) : null;
  }

  async listPolicies(bankId: string): Promise<CommissionPolicyVersion[]> {
    const rows = await this.prisma.commissionPolicyVersion.findMany({
      where: { bankId },
      orderBy: [{ versionNumber: "desc" }],
    });
    return rows.map(toCommissionPolicyVersion);
  }

  async findEffectivePolicy(
    bankId: string,
    loanProductId?: string | null,
  ): Promise<CommissionPolicyVersion | null> {
    if (loanProductId) {
      const scoped = await this.prisma.commissionPolicyVersion.findFirst({
        where: { bankId, loanProductId, status: "EFFECTIVE" },
        orderBy: { versionNumber: "desc" },
      });
      if (scoped) return toCommissionPolicyVersion(scoped);
    }
    const bankWide = await this.prisma.commissionPolicyVersion.findFirst({
      where: { bankId, loanProductId: null, status: "EFFECTIVE" },
      orderBy: { versionNumber: "desc" },
    });
    return bankWide ? toCommissionPolicyVersion(bankWide) : null;
  }

  async createPolicyWithAudit(
    data: CreateCommissionPolicyData,
    organizationId: string,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<CommissionPolicyVersion> {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.commissionPolicyVersion.findFirst({
        where: {
          bankId: data.bankId,
          loanProductId: data.loanProductId ?? null,
        },
        orderBy: { versionNumber: "desc" },
      });
      const versionNumber = (latest?.versionNumber ?? 0) + 1;
      const row = await tx.commissionPolicyVersion.create({
        data: {
          bankId: data.bankId,
          loanProductId: data.loanProductId ?? null,
          versionNumber,
          status: "DRAFTED",
          rateStructure: data.rateStructure as Prisma.InputJsonValue,
          clawbackWindowDays: data.clawbackWindowDays ?? null,
          clawbackRule: (data.clawbackRule ?? undefined) as Prisma.InputJsonValue | undefined,
          createdByUserId: data.createdByUserId,
        },
      });
      const policy = toCommissionPolicyVersion(row);
      await tx.bankAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CommissionPolicyDrafted",
          targetType: "CommissionPolicyVersion",
          targetId: policy.id,
          correlationId: correlationId ?? null,
          afterState: toPolicyAuditJson(policy),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return policy;
    });
  }

  async publishPolicyWithAudit(
    id: string,
    organizationId: string,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<CommissionPolicyVersion> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.commissionPolicyVersion.findUniqueOrThrow({ where: { id } });
      const before = toCommissionPolicyVersion(beforeRow);

      const effective = await tx.commissionPolicyVersion.findMany({
        where: {
          bankId: before.bankId,
          loanProductId: before.loanProductId,
          status: "EFFECTIVE",
        },
      });
      for (const prior of effective) {
        await tx.commissionPolicyVersion.update({
          where: { id: prior.id },
          data: { status: "SUPERSEDED", effectiveTo: new Date() },
        });
        await tx.bankAuditLog.create({
          data: {
            organizationId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            action: "CommissionPolicySuperseded",
            targetType: "CommissionPolicyVersion",
            targetId: prior.id,
            correlationId: correlationId ?? null,
            beforeState: toPolicyAuditJson(toCommissionPolicyVersion(prior)),
            afterState: toPolicyAuditJson({
              ...toCommissionPolicyVersion(prior),
              status: "SUPERSEDED",
            }),
            recordHash: PLACEHOLDER_RECORD_HASH,
          },
        });
      }

      const row = await tx.commissionPolicyVersion.update({
        where: { id },
        data: {
          status: "EFFECTIVE",
          effectiveFrom: new Date(),
          publishedAt: new Date(),
        },
      });
      const policy = toCommissionPolicyVersion(row);
      await tx.bankAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CommissionPolicyPublished",
          targetType: "CommissionPolicyVersion",
          targetId: policy.id,
          correlationId: correlationId ?? null,
          beforeState: toPolicyAuditJson(before),
          afterState: toPolicyAuditJson(policy),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return policy;
    });
  }
}
