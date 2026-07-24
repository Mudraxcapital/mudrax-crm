export class DisbursementNotFoundError extends Error {
  constructor(id: string) { super(`Disbursement ${id} was not found.`); this.name = "DisbursementNotFoundError"; }
}
export class CommissionNotFoundError extends Error {
  constructor(id: string) { super(`Commission ${id} was not found.`); this.name = "CommissionNotFoundError"; }
}
export class DuplicateBankReferenceError extends Error {
  constructor(ref: string) { super(`Bank reference ${ref} already exists for this Bank.`); this.name = "DuplicateBankReferenceError"; }
}
export class ApplicationNotApprovedError extends Error {
  constructor(id: string) { super(`Loan Application ${id} is not Approved for disbursement.`); this.name = "ApplicationNotApprovedError"; }
}
export class InvalidDisbursementTransitionError extends Error {
  constructor(from: string, to: string) { super(`Cannot transition Disbursement from ${from} to ${to}.`); this.name = "InvalidDisbursementTransitionError"; }
}
export class InvalidCommissionTransitionError extends Error {
  constructor(from: string, to: string) { super(`Cannot transition Commission from ${from} to ${to}.`); this.name = "InvalidCommissionTransitionError"; }
}
export class CommissionPolicyMissingError extends Error {
  constructor(bankId: string) { super(`No Effective Commission Policy for Bank ${bankId}.`); this.name = "CommissionPolicyMissingError"; }
}
