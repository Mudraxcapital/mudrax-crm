// ============================================================================
// src/modules/telephony/__tests__/fakeLookupPorts.ts
//
// In-memory LeadLookupPort/CustomerLookupPort/UserLookupPort/
// TelephonyProviderPort doubles for use-case unit tests — see leads'
// fakeLookupPorts.ts's identical doc comment/rationale.
// ============================================================================

import type { LeadLookupPort, LeadLookupSummary } from "../application/ports/LeadLookupPort";
import type {
  CustomerLookupPort,
  CustomerLookupSummary,
} from "../application/ports/CustomerLookupPort";
import type { UserLookupPort, UserLookupSummary } from "../application/ports/UserLookupPort";
import type {
  OriginateCallInput,
  OriginateCallResult,
  TelephonyProviderPort,
} from "../application/ports/TelephonyProviderPort";

export class FakeLeadLookupPort implements LeadLookupPort {
  leads = new Map<string, LeadLookupSummary>();

  async findById(leadId: string): Promise<LeadLookupSummary | null> {
    return this.leads.get(leadId) ?? null;
  }
}

export class FakeCustomerLookupPort implements CustomerLookupPort {
  customers = new Map<string, CustomerLookupSummary>();

  async findById(customerId: string): Promise<CustomerLookupSummary | null> {
    return this.customers.get(customerId) ?? null;
  }
}

export class FakeUserLookupPort implements UserLookupPort {
  users = new Map<string, UserLookupSummary>();

  async findById(userId: string): Promise<UserLookupSummary | null> {
    return this.users.get(userId) ?? null;
  }
}

export class FakeTelephonyProviderPort implements TelephonyProviderPort {
  callCount = 0;

  async originateCall(input: OriginateCallInput): Promise<OriginateCallResult> {
    void input;
    this.callCount += 1;
    return { providerCallId: `fake-provider-call-${this.callCount}` };
  }
}
