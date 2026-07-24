import { prisma } from "@/infra/db/client";
import { PrismaDisbursementRepository } from "./infrastructure/repositories/PrismaDisbursementRepository";
import {
  BanksCommissionPolicyAdapter,
  LoanAccountsModuleAdapter,
  LoanApplicationsModuleAdapter,
  LoanProductsModuleAdapter,
} from "./infrastructure/adapters/ModuleAdapters";
import { makeRecordDisbursement } from "./application/use-cases/recordDisbursement";
import { makeUpdateDisbursementStatus } from "./application/use-cases/updateDisbursementStatus";
import { makeUpdateCommissionStatus } from "./application/use-cases/updateCommissionStatus";
import {
  makeGetDisbursement,
  makeListCommissions,
  makeListDisbursements,
} from "./application/use-cases/getDisbursement";

export type { Disbursement, DisbursementStatus } from "./domain/entities/Disbursement";
export { DISBURSEMENT_STATUSES } from "./domain/entities/Disbursement";
export type { Commission, CommissionStatus } from "./domain/entities/Commission";
export { COMMISSION_STATUSES } from "./domain/entities/Commission";
export type {
  DisbursementsActorType,
  DisbursementsAuditActor,
  DisbursementsAuditRecord,
} from "./domain/entities/DisbursementsAuditRecord";
export { DISBURSEMENTS_ACTOR_TYPES } from "./domain/entities/DisbursementsAuditRecord";

export {
  DisbursementNotFoundError,
  CommissionNotFoundError,
  DuplicateBankReferenceError,
  ApplicationNotApprovedError,
  InvalidDisbursementTransitionError,
  InvalidCommissionTransitionError,
  CommissionPolicyMissingError,
} from "./domain/errors/DisbursementErrors";

export type { DisbursementDto, CommissionDto } from "./application/dto/DisbursementDto";

export {
  recordDisbursementSchema,
  updateDisbursementStatusSchema,
  updateCommissionStatusSchema,
  type RecordDisbursementInput,
  type UpdateDisbursementStatusInput,
  type UpdateCommissionStatusInput,
} from "./application/validators/disbursementSchemas";

const repository = new PrismaDisbursementRepository(prisma);
const applications = new LoanApplicationsModuleAdapter();
const products = new LoanProductsModuleAdapter();
const policies = new BanksCommissionPolicyAdapter();
const loanAccounts = new LoanAccountsModuleAdapter();

export const recordDisbursement = makeRecordDisbursement(
  repository, applications, products, policies, loanAccounts,
);
export const updateDisbursementStatus = makeUpdateDisbursementStatus(repository);
export const updateCommissionStatus = makeUpdateCommissionStatus(repository);
export const getDisbursement = makeGetDisbursement(repository);
export const listDisbursements = makeListDisbursements(repository);
export const listCommissions = makeListCommissions(repository);
