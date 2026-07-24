export class BankNotFoundError extends Error {
  constructor(id: string) {
    super(`Bank ${id} was not found.`);
    this.name = "BankNotFoundError";
  }
}

export class BankBranchNotFoundError extends Error {
  constructor(id: string) {
    super(`Bank Branch ${id} was not found.`);
    this.name = "BankBranchNotFoundError";
  }
}

export class DuplicateBankCodeError extends Error {
  constructor(code: string) {
    super(`A Bank with code "${code}" already exists in this Organization.`);
    this.name = "DuplicateBankCodeError";
  }
}

export class DuplicateBankNameError extends Error {
  constructor(name: string) {
    super(`A Bank named "${name}" already exists in this Organization.`);
    this.name = "DuplicateBankNameError";
  }
}

export class DuplicateBankBranchCodeError extends Error {
  constructor(code: string) {
    super(`A Bank Branch with code "${code}" already exists for this Bank.`);
    this.name = "DuplicateBankBranchCodeError";
  }
}

export class CommissionPolicyNotFoundError extends Error {
  constructor(id: string) {
    super(`Commission Policy Version ${id} was not found.`);
    this.name = "CommissionPolicyNotFoundError";
  }
}

export class InvalidCommissionPolicyTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`A Commission Policy Version cannot transition from ${from} to ${to}.`);
    this.name = "InvalidCommissionPolicyTransitionError";
  }
}

export class BankNotActiveError extends Error {
  constructor(id: string) {
    super(`Bank ${id} is not ACTIVE and cannot be selected for new products or applications.`);
    this.name = "BankNotActiveError";
  }
}
