export class LoanAccountNotFoundError extends Error {
  constructor(id: string) { super(`Loan Account ${id} was not found.`); this.name = "LoanAccountNotFoundError"; }
}
export class LoanAccountAlreadyExistsError extends Error {
  constructor(applicationId: string) {
    super(`A Loan Account already exists for Application ${applicationId}.`);
    this.name = "LoanAccountAlreadyExistsError";
  }
}
export class LoanStatusNotFoundError extends Error {
  constructor(name: string) { super(`Loan Status ${name} was not found.`); this.name = "LoanStatusNotFoundError"; }
}
export class InvalidLoanAccountTransitionError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidLoanAccountTransitionError"; }
}
