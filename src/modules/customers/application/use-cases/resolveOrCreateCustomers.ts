// ============================================================================
// src/modules/customers/application/use-cases/resolveOrCreateCustomers.ts
//
// Bulk resolve-or-create for Excel/CSV Lead import — few DB round-trips
// instead of find+create per row.
// ============================================================================

import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import type { CustomerAuditActor } from "../../domain/entities/CustomerAuditRecord";
import { prepareIdentifier } from "../../domain/services/identifierMatching";
import type { CustomerSummaryDto } from "../dto/CustomerDto";
import { toCustomerSummaryDto } from "../dto/CustomerDto";

export interface ResolveOrCreateCustomerRow {
  organizationId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  ownerManagerId?: string | null;
}

export function makeResolveOrCreateCustomers(repository: CustomerRepository) {
  return async function resolveOrCreateCustomers(command: {
    rows: ResolveOrCreateCustomerRow[];
    actor: CustomerAuditActor;
    correlationId?: string | null;
  }): Promise<CustomerSummaryDto[]> {
    const { rows, actor, correlationId } = command;
    if (rows.length === 0) return [];

    const organizationId = rows[0]!.organizationId;
    const phoneNorms = new Set<string>();
    const emailNorms = new Set<string>();
    const preparedRows = rows.map((row) => {
      const phone = row.phone?.trim() || null;
      const email = row.email?.trim() || null;
      const phonePrepared = phone ? prepareIdentifier("PHONE", phone) : null;
      const emailPrepared = email ? prepareIdentifier("EMAIL", email) : null;
      if (phonePrepared?.valueNormalized) phoneNorms.add(phonePrepared.valueNormalized);
      if (emailPrepared?.valueNormalized) emailNorms.add(emailPrepared.valueNormalized);
      return { row, phone, email, phonePrepared, emailPrepared };
    });

    const [byPhoneHits, byEmailHits] = await Promise.all([
      repository.listByNormalizedIdentifiers(organizationId, "PHONE", [...phoneNorms]),
      repository.listByNormalizedIdentifiers(organizationId, "EMAIL", [...emailNorms]),
    ]);

    const customerByPhone = new Map<string, CustomerSummaryDto>();
    for (const hit of byPhoneHits) {
      const summary = toCustomerSummaryDto(hit.customer);
      for (const identifier of hit.identifiers) {
        if (
          identifier.type === "PHONE" &&
          identifier.status === "ACTIVE" &&
          identifier.valueNormalized
        ) {
          if (!customerByPhone.has(identifier.valueNormalized)) {
            customerByPhone.set(identifier.valueNormalized, summary);
          }
        }
      }
    }
    const customerByEmail = new Map<string, CustomerSummaryDto>();
    for (const hit of byEmailHits) {
      const summary = toCustomerSummaryDto(hit.customer);
      for (const identifier of hit.identifiers) {
        if (
          identifier.type === "EMAIL" &&
          identifier.status === "ACTIVE" &&
          identifier.valueNormalized
        ) {
          if (!customerByEmail.has(identifier.valueNormalized)) {
            customerByEmail.set(identifier.valueNormalized, summary);
          }
        }
      }
    }

    const results: Array<CustomerSummaryDto | null> = new Array(rows.length).fill(null);
    const toCreate: Array<{
      index: number;
      dedupeKey: string;
      fullName: string;
      ownerManagerId: string | null;
      identifiers: Array<{
        type: "PHONE" | "EMAIL";
        valueHash: string | null;
        valueNormalized: string | null;
        valueMasked: string;
      }>;
    }> = [];
    const pendingByKey = new Map<string, number>();

    for (let index = 0; index < preparedRows.length; index++) {
      const { row, phonePrepared, emailPrepared } = preparedRows[index]!;
      const phoneKey = phonePrepared?.valueNormalized ?? null;
      const emailKey = emailPrepared?.valueNormalized ?? null;

      const existing =
        (phoneKey ? customerByPhone.get(phoneKey) : undefined) ??
        (emailKey ? customerByEmail.get(emailKey) : undefined);
      if (existing) {
        results[index] = existing;
        continue;
      }

      const dedupeKey = phoneKey ? `p:${phoneKey}` : emailKey ? `e:${emailKey}` : `n:${index}`;
      const pendingIndex = pendingByKey.get(dedupeKey);
      if (pendingIndex != null) {
        // Same contact appears later in the file — reuse the create slot.
        toCreate.push({
          index,
          dedupeKey,
          fullName: row.fullName,
          ownerManagerId: row.ownerManagerId ?? null,
          identifiers: [],
        });
        // Alias via shared dedupeKey — resolved after create.
        continue;
      }

      const identifiers: Array<{
        type: "PHONE" | "EMAIL";
        valueHash: string | null;
        valueNormalized: string | null;
        valueMasked: string;
      }> = [];
      if (phonePrepared?.valueNormalized) {
        identifiers.push({
          type: "PHONE",
          valueHash: null,
          valueNormalized: phonePrepared.valueNormalized,
          valueMasked: phonePrepared.valueMasked,
        });
      }
      if (emailPrepared?.valueNormalized) {
        identifiers.push({
          type: "EMAIL",
          valueHash: null,
          valueNormalized: emailPrepared.valueNormalized,
          valueMasked: emailPrepared.valueMasked,
        });
      }
      if (identifiers.length === 0) {
        identifiers.push({
          type: "EMAIL",
          valueHash: null,
          valueNormalized: `import+${Date.now()}.${index}.${Math.random().toString(36).slice(2, 8)}@mudrax.local`,
          valueMasked: "im***@mudrax.local",
        });
      }

      pendingByKey.set(dedupeKey, index);
      toCreate.push({
        index,
        dedupeKey,
        fullName: row.fullName,
        ownerManagerId: row.ownerManagerId ?? null,
        identifiers,
      });
    }

    // Unique creates only (first occurrence of each dedupeKey with identifiers).
    const uniqueCreates = toCreate.filter((item) => item.identifiers.length > 0);
    const created = await repository.createManyWithAudit(
      uniqueCreates.map((item) => ({
        organizationId,
        fullName: item.fullName,
        ownerManagerId: item.ownerManagerId,
        identifiers: item.identifiers,
      })),
      actor,
      correlationId,
    );

    const createdByKey = new Map<string, CustomerSummaryDto>();
    uniqueCreates.forEach((item, createIndex) => {
      const customer = created[createIndex]!.customer;
      const summary = toCustomerSummaryDto(customer);
      createdByKey.set(item.dedupeKey, summary);
      results[item.index] = summary;
      for (const identifier of item.identifiers) {
        if (identifier.type === "PHONE" && identifier.valueNormalized) {
          customerByPhone.set(identifier.valueNormalized, summary);
        }
        if (identifier.type === "EMAIL" && identifier.valueNormalized) {
          customerByEmail.set(identifier.valueNormalized, summary);
        }
      }
    });

    for (const item of toCreate) {
      if (results[item.index]) continue;
      const summary = createdByKey.get(item.dedupeKey);
      if (summary) results[item.index] = summary;
    }

    return results.map((item, index) => {
      if (item) return item;
      throw new Error(`Failed to resolve customer for import row index ${index}`);
    });
  };
}
