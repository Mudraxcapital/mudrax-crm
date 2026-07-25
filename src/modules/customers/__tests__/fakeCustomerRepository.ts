// ============================================================================
// src/modules/customers/__tests__/fakeCustomerRepository.ts
//
// In-memory CustomerRepository double for use-case unit tests — see
// organization's fakeTeamRepository.ts's identical doc comment.
// ============================================================================

import type {
  CreateCustomerData,
  CreateDuplicateCandidateData,
  CustomerRepository,
  CustomerWithIdentifiers,
  ListCustomersOptions,
  MergeCustomersData,
  UpdateCustomerData,
} from "../domain/repositories/CustomerRepository";
import type { Customer } from "../domain/entities/Customer";
import type { CustomerIdentifier, IdentifierType } from "../domain/entities/CustomerIdentifier";
import { isStrongIdentifierType } from "../domain/entities/CustomerIdentifier";
import type {
  CustomerAuditActor,
  CustomerAuditRecord,
} from "../domain/entities/CustomerAuditRecord";
import type {
  CustomerDuplicateCandidate,
  CustomerMerge,
  DuplicateCandidateStatus,
} from "../domain/entities/CustomerDuplicateCandidate";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0004-${String(nextId++).padStart(12, "0")}`;
}

export class FakeCustomerRepository implements CustomerRepository {
  customers = new Map<string, Customer>();
  identifiers = new Map<string, CustomerIdentifier[]>();
  duplicates = new Map<string, CustomerDuplicateCandidate>();
  merges: CustomerMerge[] = [];
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

  async listByNormalizedIdentifier(
    organizationId: string,
    type: IdentifierType,
    valueNormalized: string,
  ): Promise<CustomerWithIdentifiers[]> {
    const results: CustomerWithIdentifiers[] = [];
    for (const [customerId, identifierList] of this.identifiers.entries()) {
      const customer = this.customers.get(customerId);
      if (!customer || customer.organizationId !== organizationId || customer.status !== "ACTIVE") {
        continue;
      }
      if (
        identifierList.some(
          (i) =>
            i.type === type && i.valueNormalized === valueNormalized && i.status === "ACTIVE",
        )
      ) {
        results.push({ customer, identifiers: identifierList });
      }
    }
    return results;
  }

  async list(organizationId: string, options?: ListCustomersOptions): Promise<Customer[]> {
    let results = [...this.customers.values()].filter(
      (customer) => customer.organizationId === organizationId && customer.status !== "MERGED",
    );
    if (options?.ownerManagerId) {
      results = results.filter((customer) => customer.ownerManagerId === options.ownerManagerId);
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      results = results.filter((customer) => customer.fullName.toLowerCase().includes(search));
    }
    return results;
  }

  async listWithIdentifiers(
    organizationId: string,
    options?: ListCustomersOptions,
  ): Promise<CustomerWithIdentifiers[]> {
    const customers = await this.list(organizationId, options);
    return customers.map((customer) => ({
      customer,
      identifiers: this.identifiers.get(customer.id) ?? [],
    }));
  }

  async count(
    organizationId: string,
    options?: Pick<ListCustomersOptions, "ownerManagerId">,
  ): Promise<number> {
    return [...this.customers.values()].filter((c) => {
      if (c.organizationId !== organizationId || c.status === "MERGED") return false;
      if (options?.ownerManagerId && c.ownerManagerId !== options.ownerManagerId) return false;
      return true;
    }).length;
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
      ownerManagerId: data.ownerManagerId ?? null,
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

  async findDuplicateCandidate(id: string): Promise<CustomerDuplicateCandidate | null> {
    return this.duplicates.get(id) ?? null;
  }

  async listDuplicateCandidates(
    organizationId: string,
    status?: DuplicateCandidateStatus,
  ): Promise<CustomerDuplicateCandidate[]> {
    return [...this.duplicates.values()].filter((candidate) => {
      const a = this.customers.get(candidate.customerAId);
      if (!a || a.organizationId !== organizationId) return false;
      if (status && candidate.status !== status) return false;
      return true;
    });
  }

  async findDuplicatePair(
    customerAId: string,
    customerBId: string,
  ): Promise<CustomerDuplicateCandidate | null> {
    const [a, b] =
      customerAId < customerBId ? [customerAId, customerBId] : [customerBId, customerAId];
    return (
      [...this.duplicates.values()].find(
        (candidate) => candidate.customerAId === a && candidate.customerBId === b,
      ) ?? null
    );
  }

  async createDuplicateCandidate(
    data: CreateDuplicateCandidateData,
  ): Promise<CustomerDuplicateCandidate> {
    const [a, b] =
      data.customerAId < data.customerBId
        ? [data.customerAId, data.customerBId]
        : [data.customerBId, data.customerAId];
    const candidate: CustomerDuplicateCandidate = {
      id: makeId(),
      customerAId: a,
      customerBId: b,
      matchType: data.matchType,
      matchScore: data.matchScore ?? null,
      status: "DETECTED",
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.duplicates.set(candidate.id, candidate);
    return candidate;
  }

  async updateDuplicateCandidateStatus(
    id: string,
    status: DuplicateCandidateStatus,
    reviewedByUserId: string | null,
  ): Promise<CustomerDuplicateCandidate> {
    const existing = this.duplicates.get(id);
    if (!existing) throw new Error(`FakeCustomerRepository: duplicate ${id} not found`);
    const updated = {
      ...existing,
      status,
      reviewedByUserId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };
    this.duplicates.set(id, updated);
    return updated;
  }

  async mergeWithAudit(
    data: MergeCustomersData,
    actor: CustomerAuditActor,
    correlationId?: string | null,
  ): Promise<{ survivor: CustomerWithIdentifiers; merge: CustomerMerge }> {
    const survivor = this.customers.get(data.survivingCustomerId);
    const mergedAway = this.customers.get(data.mergedAwayCustomerId);
    if (!survivor || !mergedAway) throw new Error("Customer not found for merge");

    const survivorIds = this.identifiers.get(survivor.id) ?? [];
    const mergedIds = this.identifiers.get(mergedAway.id) ?? [];
    for (const identifier of mergedIds) {
      if (identifier.status !== "ACTIVE") continue;
      const already = survivorIds.some(
        (existing) =>
          existing.type === identifier.type &&
          ((identifier.valueHash && existing.valueHash === identifier.valueHash) ||
            (identifier.valueNormalized &&
              existing.valueNormalized === identifier.valueNormalized)),
      );
      if (already) {
        identifier.status = "SUPERSEDED";
      } else {
        identifier.customerId = survivor.id;
        survivorIds.push(identifier);
      }
    }
    this.identifiers.set(survivor.id, survivorIds);
    this.identifiers.set(mergedAway.id, mergedIds.filter((i) => i.customerId === mergedAway.id));

    const updatedMerged: Customer = {
      ...mergedAway,
      status: "MERGED",
      mergedIntoCustomerId: survivor.id,
      updatedAt: new Date(),
    };
    this.customers.set(mergedAway.id, updatedMerged);

    const merge: CustomerMerge = {
      id: makeId(),
      survivingCustomerId: survivor.id,
      mergedAwayCustomerId: mergedAway.id,
      duplicateCandidateId: data.duplicateCandidateId ?? null,
      mergedByUserId: data.mergedByUserId,
      reason: data.reason ?? null,
      mergedAt: new Date(),
    };
    this.merges.push(merge);

    if (data.duplicateCandidateId) {
      await this.updateDuplicateCandidateStatus(
        data.duplicateCandidateId,
        "MERGED",
        data.mergedByUserId,
      );
    }

    this.recordAudit({
      actor,
      action: "CustomerMerged",
      targetId: survivor.id,
      correlationId: correlationId ?? mergedAway.id,
      beforeState: { ...survivor },
      afterState: { ...survivor, mergedAwayCustomerId: mergedAway.id },
    });

    return {
      survivor: { customer: survivor, identifiers: this.identifiers.get(survivor.id) ?? [] },
      merge,
    };
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
