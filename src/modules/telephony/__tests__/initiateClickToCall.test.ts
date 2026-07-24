import { beforeEach, describe, expect, it } from "vitest";
import { makeInitiateClickToCall } from "../application/use-cases/initiateClickToCall";
import {
  InvalidAgentReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
} from "../domain/errors/TelephonyErrors";
import {
  FakeCallAttemptRepository,
  FakeCallOutcomeRepository,
} from "./fakeTelephonyRepositories";
import {
  FakeCustomerLookupPort,
  FakeLeadLookupPort,
  FakeTelephonyProviderPort,
  FakeUserLookupPort,
} from "./fakeLookupPorts";

const ORG_ID = "00000000-0000-0000-0001-000000000000";
const LEAD_ID = "lead-1";
const CUSTOMER_ID = "customer-1";
const AGENT_ID = "agent-1";

describe("initiateClickToCall", () => {
  let repository: FakeCallAttemptRepository;
  let callOutcomeRepository: FakeCallOutcomeRepository;
  let leadLookup: FakeLeadLookupPort;
  let customerLookup: FakeCustomerLookupPort;
  let userLookup: FakeUserLookupPort;
  let provider: FakeTelephonyProviderPort;
  let initiateClickToCall: ReturnType<typeof makeInitiateClickToCall>;

  beforeEach(() => {
    repository = new FakeCallAttemptRepository();
    callOutcomeRepository = new FakeCallOutcomeRepository();
    leadLookup = new FakeLeadLookupPort();
    customerLookup = new FakeCustomerLookupPort();
    userLookup = new FakeUserLookupPort();
    provider = new FakeTelephonyProviderPort();

    leadLookup.leads.set(LEAD_ID, { id: LEAD_ID, organizationId: ORG_ID });
    customerLookup.customers.set(CUSTOMER_ID, { id: CUSTOMER_ID, organizationId: ORG_ID });
    userLookup.users.set(AGENT_ID, {
      id: AGENT_ID,
      organizationId: ORG_ID,
      status: "ACTIVE",
      fullName: "Agent Smith",
    });

    initiateClickToCall = makeInitiateClickToCall(
      repository,
      callOutcomeRepository,
      leadLookup,
      customerLookup,
      userLookup,
      provider,
    );
  });

  it("originates a Call via the provider and creates a RINGING outbound Call Attempt against a Lead", async () => {
    const dto = await initiateClickToCall({
      organizationId: ORG_ID,
      input: { leadId: LEAD_ID },
      actor: { actorType: "USER", actorId: AGENT_ID },
    });

    expect(dto.leadId).toBe(LEAD_ID);
    expect(dto.direction).toBe("OUTBOUND");
    expect(dto.status).toBe("RINGING");
    expect(dto.providerCallId).toMatch(/^fake-provider-call-/);
    expect(provider.callCount).toBe(1);
  });

  it("defaults the assigned Agent to the acting User when agentUserId is not supplied", async () => {
    const dto = await initiateClickToCall({
      organizationId: ORG_ID,
      input: { customerId: CUSTOMER_ID },
      actor: { actorType: "USER", actorId: AGENT_ID },
    });

    expect(dto.agentUserId).toBe(AGENT_ID);
  });

  it("records a CallAttemptCreated Audit Record", async () => {
    const dto = await initiateClickToCall({
      organizationId: ORG_ID,
      input: { leadId: LEAD_ID },
      actor: { actorType: "USER", actorId: AGENT_ID },
    });

    const auditEntries = await repository.listAuditLog(dto.id);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("CallAttemptCreated");
  });

  it("rejects a Call against a non-existent Lead", async () => {
    await expect(
      initiateClickToCall({
        organizationId: ORG_ID,
        input: { leadId: "does-not-exist" },
        actor: { actorType: "USER", actorId: AGENT_ID },
      }),
    ).rejects.toBeInstanceOf(InvalidLeadReferenceError);
  });

  it("rejects a Call against a non-existent Customer", async () => {
    await expect(
      initiateClickToCall({
        organizationId: ORG_ID,
        input: { customerId: "does-not-exist" },
        actor: { actorType: "USER", actorId: AGENT_ID },
      }),
    ).rejects.toBeInstanceOf(InvalidCustomerReferenceError);
  });

  it("rejects assignment to a non-existent Agent", async () => {
    await expect(
      initiateClickToCall({
        organizationId: ORG_ID,
        input: { leadId: LEAD_ID, agentUserId: "does-not-exist" },
        actor: { actorType: "USER", actorId: AGENT_ID },
      }),
    ).rejects.toBeInstanceOf(InvalidAgentReferenceError);
  });
});
