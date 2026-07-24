export class LoanApplicationNotFoundError extends Error {
  constructor(id: string) { super(`Loan Application ${id} was not found.`); this.name = "LoanApplicationNotFoundError"; }
}
export class LoanOfferNotFoundError extends Error {
  constructor(id: string) { super(`Loan Offer ${id} was not found.`); this.name = "LoanOfferNotFoundError"; }
}
export class EligibilitySnapshotNotFoundError extends Error {
  constructor(id: string) { super(`Eligibility Snapshot ${id} was not found.`); this.name = "EligibilitySnapshotNotFoundError"; }
}
export class ApplicationStatusNotFoundError extends Error {
  constructor(idOrBucket: string) { super(`Application Status ${idOrBucket} was not found.`); this.name = "ApplicationStatusNotFoundError"; }
}
export class InvalidApplicationTransitionError extends Error {
  constructor(from: string, to: string) { super(`Cannot transition application from ${from} to ${to}.`); this.name = "InvalidApplicationTransitionError"; }
}
export class InvalidOfferTransitionError extends Error {
  constructor(from: string, to: string) { super(`Cannot transition offer from ${from} to ${to}.`); this.name = "InvalidOfferTransitionError"; }
}
export class InvalidCustomerReferenceError extends Error {
  constructor(id: string) { super(`Customer ${id} was not found.`); this.name = "InvalidCustomerReferenceError"; }
}
export class InvalidLeadReferenceError extends Error {
  constructor(id: string) { super(`Lead ${id} was not found.`); this.name = "InvalidLeadReferenceError"; }
}
export class InvalidLoanProductReferenceError extends Error {
  constructor(id: string) { super(`Loan Product ${id} was not found or is not ACTIVE.`); this.name = "InvalidLoanProductReferenceError"; }
}
export class OfferExpiredError extends Error {
  constructor(id: string) { super(`Loan Offer ${id} has expired.`); this.name = "OfferExpiredError"; }
}
