import type { Bank } from "../../domain/entities/Bank";
import type { BankBranch } from "../../domain/entities/BankBranch";
import type { CommissionPolicyVersion } from "../../domain/entities/CommissionPolicyVersion";

export interface BankDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: Bank["status"];
  createdAt: string;
  updatedAt: string;
}

export interface BankBranchDto {
  id: string;
  bankId: string;
  name: string;
  code: string;
  address: string | null;
  status: BankBranch["status"];
  createdAt: string;
  updatedAt: string;
}

export interface CommissionPolicyVersionDto {
  id: string;
  bankId: string;
  loanProductId: string | null;
  versionNumber: number;
  status: CommissionPolicyVersion["status"];
  rateStructure: Record<string, unknown>;
  clawbackWindowDays: number | null;
  clawbackRule: Record<string, unknown> | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdByUserId: string;
  createdAt: string;
  publishedAt: string | null;
}

export function toBankDto(bank: Bank): BankDto {
  return {
    id: bank.id,
    organizationId: bank.organizationId,
    name: bank.name,
    code: bank.code,
    status: bank.status,
    createdAt: bank.createdAt.toISOString(),
    updatedAt: bank.updatedAt.toISOString(),
  };
}

export function toBankBranchDto(branch: BankBranch): BankBranchDto {
  return {
    id: branch.id,
    bankId: branch.bankId,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    status: branch.status,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
  };
}

export function toCommissionPolicyVersionDto(
  policy: CommissionPolicyVersion,
): CommissionPolicyVersionDto {
  return {
    id: policy.id,
    bankId: policy.bankId,
    loanProductId: policy.loanProductId,
    versionNumber: policy.versionNumber,
    status: policy.status,
    rateStructure: policy.rateStructure,
    clawbackWindowDays: policy.clawbackWindowDays,
    clawbackRule: policy.clawbackRule,
    effectiveFrom: policy.effectiveFrom?.toISOString() ?? null,
    effectiveTo: policy.effectiveTo?.toISOString() ?? null,
    createdByUserId: policy.createdByUserId,
    createdAt: policy.createdAt.toISOString(),
    publishedAt: policy.publishedAt?.toISOString() ?? null,
  };
}
