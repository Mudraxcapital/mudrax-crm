// ============================================================================
// src/modules/documents/__tests__/fakeLookupPorts.ts
// ============================================================================

import { createHash } from "node:crypto";
import type {
  CustomerLookupPort,
  CustomerLookupSummary,
} from "../application/ports/CustomerLookupPort";
import type {
  DocumentStoragePort,
  StoreDocumentFileInput,
  StoreDocumentFileResult,
} from "../application/ports/DocumentStoragePort";
import type { LeadLookupPort, LeadLookupSummary } from "../application/ports/LeadLookupPort";

export class FakeCustomerLookupPort implements CustomerLookupPort {
  customers = new Map<string, CustomerLookupSummary>();

  seed(customer: CustomerLookupSummary): void {
    this.customers.set(customer.id, customer);
  }

  async findById(customerId: string): Promise<CustomerLookupSummary | null> {
    return this.customers.get(customerId) ?? null;
  }
}

export class FakeLeadLookupPort implements LeadLookupPort {
  leads = new Map<string, LeadLookupSummary>();

  seed(lead: LeadLookupSummary): void {
    this.leads.set(lead.id, lead);
  }

  async findById(leadId: string): Promise<LeadLookupSummary | null> {
    return this.leads.get(leadId) ?? null;
  }
}

export class FakeDocumentStoragePort implements DocumentStoragePort {
  files = new Map<string, Buffer>();

  async store(input: StoreDocumentFileInput): Promise<StoreDocumentFileResult> {
    const storageKey = input.relativeKey.replace(/\\/g, "/");
    this.files.set(storageKey, input.content);
    return {
      storageKey,
      sizeBytes: input.content.byteLength,
      checksum: createHash("sha256").update(input.content).digest("hex"),
    };
  }

  async retrieve(storageKey: string): Promise<Buffer> {
    const content = this.files.get(storageKey);
    if (!content) throw new Error(`Missing storage key ${storageKey}`);
    return content;
  }

  async exists(storageKey: string): Promise<boolean> {
    return this.files.has(storageKey);
  }
}
