import { prisma } from "@/infra/db/client";
import { PrismaBankRepository } from "./infrastructure/repositories/PrismaBankRepository";
import { makeCreateBank } from "./application/use-cases/createBank";
import { makeUpdateBank } from "./application/use-cases/updateBank";
import {
  makeGetBank,
  makeGetEffectiveCommissionPolicy,
  makeListBankBranches,
  makeListBanks,
  makeListCommissionPolicies,
} from "./application/use-cases/getBank";
import { makeCreateBankBranch } from "./application/use-cases/createBankBranch";
import { makeUpdateBankBranch } from "./application/use-cases/updateBankBranch";
import { makeCreateCommissionPolicy } from "./application/use-cases/createCommissionPolicy";
import { makePublishCommissionPolicy } from "./application/use-cases/publishCommissionPolicy";

export type { Bank, BankStatus } from "./domain/entities/Bank";
export { BANK_STATUSES } from "./domain/entities/Bank";
export type { BankBranch, BankBranchStatus } from "./domain/entities/BankBranch";
export { BANK_BRANCH_STATUSES } from "./domain/entities/BankBranch";
export type {
  CommissionPolicyStatus,
  CommissionPolicyVersion,
} from "./domain/entities/CommissionPolicyVersion";
export { COMMISSION_POLICY_STATUSES } from "./domain/entities/CommissionPolicyVersion";
export type {
  BanksActorType,
  BanksAuditActor,
  BanksAuditRecord,
} from "./domain/entities/BanksAuditRecord";
export { BANKS_ACTOR_TYPES } from "./domain/entities/BanksAuditRecord";

export {
  BankNotFoundError,
  BankBranchNotFoundError,
  DuplicateBankCodeError,
  DuplicateBankNameError,
  DuplicateBankBranchCodeError,
  CommissionPolicyNotFoundError,
  InvalidCommissionPolicyTransitionError,
  BankNotActiveError,
} from "./domain/errors/BankErrors";

export type {
  BankDto,
  BankBranchDto,
  CommissionPolicyVersionDto,
} from "./application/dto/BankDto";

export {
  createBankSchema,
  updateBankSchema,
  createBankBranchSchema,
  updateBankBranchSchema,
  createCommissionPolicySchema,
  type CreateBankInput,
  type UpdateBankInput,
  type CreateBankBranchInput,
  type UpdateBankBranchInput,
  type CreateCommissionPolicyInput,
} from "./application/validators/bankSchemas";

const bankRepository = new PrismaBankRepository(prisma);

export const createBank = makeCreateBank(bankRepository);
export const updateBank = makeUpdateBank(bankRepository);
export const getBank = makeGetBank(bankRepository);
/** Soft lookup by id (cross-module ports). Returns null when missing. */
export async function findBankById(bankId: string) {
  const bank = await bankRepository.findById(bankId);
  return bank;
}
export const listBanks = makeListBanks(bankRepository);
export const createBankBranch = makeCreateBankBranch(bankRepository);
export const updateBankBranch = makeUpdateBankBranch(bankRepository);
export const listBankBranches = makeListBankBranches(bankRepository);
export const createCommissionPolicy = makeCreateCommissionPolicy(bankRepository);
export const publishCommissionPolicy = makePublishCommissionPolicy(bankRepository);
export const listCommissionPolicies = makeListCommissionPolicies(bankRepository);
export const getEffectiveCommissionPolicy = makeGetEffectiveCommissionPolicy(bankRepository);

export async function listBankAuditLog(targetId: string) {
  return bankRepository.listAuditLog(targetId);
}
