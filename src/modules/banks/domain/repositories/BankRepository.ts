import type { Bank, BankStatus } from "../entities/Bank";
import type { BankBranch, BankBranchStatus } from "../entities/BankBranch";
import type { CommissionPolicyVersion } from "../entities/CommissionPolicyVersion";
import type { BanksAuditActor, BanksAuditRecord } from "../entities/BanksAuditRecord";

export interface CreateBankData {
  organizationId: string;
  name: string;
  code: string;
  status?: BankStatus;
}

export interface UpdateBankData {
  name?: string;
  code?: string;
  status?: BankStatus;
}

export interface CreateBankBranchData {
  bankId: string;
  name: string;
  code: string;
  address?: string | null;
  status?: BankBranchStatus;
}

export interface UpdateBankBranchData {
  name?: string;
  code?: string;
  address?: string | null;
  status?: BankBranchStatus;
}

export interface CreateCommissionPolicyData {
  bankId: string;
  loanProductId?: string | null;
  rateStructure: Record<string, unknown>;
  clawbackWindowDays?: number | null;
  clawbackRule?: Record<string, unknown> | null;
  createdByUserId: string;
}

export interface ListBanksFilter {
  status?: BankStatus;
  limit?: number;
  offset?: number;
}

export interface BankRepository {
  findById(id: string): Promise<Bank | null>;
  findByCode(organizationId: string, code: string): Promise<Bank | null>;
  findByName(organizationId: string, name: string): Promise<Bank | null>;
  list(organizationId: string, filter?: ListBanksFilter): Promise<Bank[]>;
  createWithAudit(
    data: CreateBankData,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<Bank>;
  updateWithAudit(
    id: string,
    data: UpdateBankData,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<Bank>;
  listAuditLog(targetId: string): Promise<BanksAuditRecord[]>;

  findBranchById(id: string): Promise<BankBranch | null>;
  findBranchByCode(bankId: string, code: string): Promise<BankBranch | null>;
  listBranches(bankId: string): Promise<BankBranch[]>;
  createBranchWithAudit(
    data: CreateBankBranchData,
    organizationId: string,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<BankBranch>;
  updateBranchWithAudit(
    id: string,
    data: UpdateBankBranchData,
    organizationId: string,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<BankBranch>;

  findPolicyById(id: string): Promise<CommissionPolicyVersion | null>;
  listPolicies(bankId: string): Promise<CommissionPolicyVersion[]>;
  findEffectivePolicy(
    bankId: string,
    loanProductId?: string | null,
  ): Promise<CommissionPolicyVersion | null>;
  createPolicyWithAudit(
    data: CreateCommissionPolicyData,
    organizationId: string,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<CommissionPolicyVersion>;
  publishPolicyWithAudit(
    id: string,
    organizationId: string,
    actor: BanksAuditActor,
    correlationId?: string | null,
  ): Promise<CommissionPolicyVersion>;
}
