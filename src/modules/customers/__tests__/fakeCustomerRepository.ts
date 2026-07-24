// ============================================================================
// src/modules/customers/__tests__/fakeCustomerRepository.ts
//
// In-memory CustomerRepository double for use-case unit tests — see
// organization's fakeTeamRepository.ts's identical doc comment.
// ============================================================================

import type {
  CreateCustomerData,
  CustomerRepository,
  CustomerWithIdentifiers,
  ListCustomersOptions,
  UpdateCustomerData,
} from "../domain/repositories/CustomerRepository";
import type { Customer } from "../domain/entities/Customer";
import type { CustomerIdentifier, IdentifierType } from "../domain/entities/CustomerIdentifier";
import { isStrongIdentifierType } from "../domain/entities/CustomerIdentifier";
import type {
  CustomerAuditActor,
  CustomerAuditRecord,
} from "../domain/entities/CustomerAuditRecord";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0004-${String(nextId++).padStart(12, "0")}`;
}

export class FakeCustomerRepository implements CustomerRepository {
  customers = new Map<string, Customer>();
  identifiers = new Map<string, CustomerIdentifier[]>();
  auditLog: CustomerAuditRecord[] = [];

  async findById(id: string): Promise<CustomerWithIdentifiers | null> {
    const customer = this.customers.get(id);
    if (!customer) return null;
    return { customer, identifiers: this.identifiers.get(id) ?? [] };
  }

  async findByIdentifierHash(
    organizationId: string,
    type: IdentifierType,
    valueHash: string,
  ): Promise<Customer | null> {
    for (const [customerId, identifierList] of this.identifiers.entries()) {
      const customer = this.customers.get(customerId);
      if (!customer || customer.organizationId !== organizationId) continue;
      const match = identifierList.find((i) => i.type === type && i.valueHash === valueHash);
      if (match) return customer;
    }
    return null;
  }

  async list(organizationId: string, options?: ListCustomersOptions): Promise<Customer[]> {
    let results = [...this.customers.values()].filter(
      (customer) => customer.organizationId === organizationId,
    );
    if (options?.search) {
      const search = options.search.toLowerCase();
      results = results.filter((customer) => customer.fullName.toLowerCase().includes(search));
    }
    return results;
  }

  async count(organizationId: string): Promise<number> {
    return [...this.customers.values()].filter((c) => c.organizationId === organizationId).length;
  }

  async createWithAudit(
    data: CreateCustomerData,
    actor: CustomerAuditActor,
    correlationId?: string | null,
  ): Promise<CustomerWithIdentifiers> {
    const now = new Date();
    const id = makeId();
    const identityConfidence = data.identifiers.some((i) => isStrongIdentifierType(i.type))
      ? "DECLARED"
      : "UNVERIFIED";

    const customer: Customer = {
      id,
      organizationId: data.organizationId,
      fullName: data.fullName,
      dob: data.dob ?? null,
      identityConfidence,
      status: "ACTIVE",
      mergedIntoCustomerId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.customers.set(id, customer);

    const identifierRows: CustomerIdentifier[] = data.identifiers.map((identifier) => ({
      id: makeId(),
      customerId: id,
      type: identifier.type,
      valueHash: identifier.valueHash,
      valueNormalized: identifier.valueNormalized,
      valueMasked: identifier.valueMasked,
      status: "ACTIVE",
      verifiedAt: identifier.verifiedAt ?? null,
      verificationSource: identifier.verificationSource ?? null,
      supersededByIdentifierId: null,
      createdAt: now,
      updatedAt: now,
    }));
    this.identifiers.set(id, identifierRows);

    this.recordAudit({
      actor,
      action: "CustomerCreated",
      targetId: id,
      correlationId,
      beforeState: null,
      afterState: { ...customer },
    });

    return { customer, identifiers: identifierRows };
  }

  async updateWithAudit(
    id: string,
    data: UpdateCustomerData,
    actor: CustomerAuditActor,
    correlationId?: string | null,
  ): Promise<CustomerWithIdentifiers> {
    const existing = this.customers.get(id);
    if (!existing) {
      throw new Error(`FakeCustomerRepository: Customer ${id} not found`);
    }

    const updated: Customer = { ...existing, ...data, updatedAt: new Date() };
    this.customers.set(id, updated);

    this.recordAudit({
      actor,
      action: "CustomerUpdated",
      targetId: id,
      correlationId,
      beforeState: { ...existing },
      afterState: { ...updated },
    });

    return { customer: updated, identifiers: this.identifiers.get(id) ?? [] };
  }

  async listAuditLog(customerId: string): Promise<CustomerAuditRecord[]> {
    return this.auditLog.filter((entry) => entry.targetId === customerId);
  }

  private recordAudit(input: {
    actor: CustomerAuditActor;
    action: string;
    targetId: string;
    correlationId?: string | null;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
  }): void {
    const previous = this.auditLog[this.auditLog.length - 1];
    this.auditLog.push({
      id: makeId(),
      organizationId: (input.afterState?.organizationId as string) ?? "",
      occurredAt: new Date(),
      actorType: input.actor.actorType,
      actorId: input.actor.actorId,
      action: input.action,
      targetType: "Customer",
      targetId: input.targetId,
      correlationId: input.correlationId ?? null,
      beforeState: input.beforeState,
      afterState: input.afterState,
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: previous?.recordHash ?? null,
    });
  }
}
