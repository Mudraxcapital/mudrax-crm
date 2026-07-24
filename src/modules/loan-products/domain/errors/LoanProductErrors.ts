export class LoanProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Loan Product ${id} was not found.`);
    this.name = "LoanProductNotFoundError";
  }
}

export class LoanProductTypeNotFoundError extends Error {
  constructor(id: string) {
    super(`Loan Product Type ${id} was not found.`);
    this.name = "LoanProductTypeNotFoundError";
  }
}

export class DuplicateLoanProductError extends Error {
  constructor() {
    super("A Loan Product with this Bank, type, and variant already exists.");
    this.name = "DuplicateLoanProductError";
  }
}

export class InvalidLoanProductRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLoanProductRangeError";
  }
}

export class InvalidBankReferenceError extends Error {
  constructor(bankId: string) {
    super(`Bank ${bankId} was not found or is not ACTIVE.`);
    this.name = "InvalidBankReferenceError";
  }
}
