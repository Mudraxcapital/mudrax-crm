import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateLead } from "../application/use-cases/createLead";
import {
  InvalidAssigneeReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadSourceReferenceError,
} from "../domain/errors/LeadErrors";
import { FakeLeadRepository } from "./fakeLeadRepository";
import {
  FakeLeadCatalogRepository,
  ORG_ID,
  SOURCE_WEBSITE,
  STAGE_NEW,
} from "./fakeLeadCatalogRepository";
import { FakeCustomerLookupPort, FakeUserLookupPort } from "./fakeLookupPorts";

const CUSTOMER_ID = "customer-1";
const USER_ID = "user-1";

describe("createLead", () => {
  let repository: FakeLeadRepository;
  let catalogRepository: FakeLeadCatalogRepository;
  let customerLookup: FakeCustomerLookupPort;
  let userLookup: FakeUserLookupPort;
  let createLead: ReturnType<typeof makeCreateLead>;

  beforeEach(() => {
    repository = new FakeLeadRepository();
    catalogRepository = new FakeLeadCatalogRepository();
    customerLookup = new FakeCustomerLookupPort();
    userLookup = new FakeUserLookupPort();
    customerLookup.customers.set(CUSTOMER_ID, {
      id: CUSTOMER_ID,
      organizationId: ORG_ID,
      fullName: "Rahul Sharma",
    });
    userLookup.users.set(USER_ID, { id: USER_ID, organizationId: ORG_ID, status: "ACTIVE" });
    createLead = makeCreateLead(repository, catalogRepository, customerLookup, userLookup);
  });

  it("creates a Lead against an existing Customer, defaulting to the INITIAL Stage", async () => {
    const dto = await createLead({
      organizationId: ORG_ID,
      input: {
        customerId: CUSTOMER_ID,
        leadSourceId: SOURCE_WEBSITE.id,
        fullNameSnapshot: "Rahul Sharma",
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.customerId).toBe(CUSTOMER_ID);
    expect(dto.currentStageId).toBe(STAGE_NEW.id);
    expect(dto.currentStageName).toBe("New");
  });

  it("records a LeadCreated Audit Record", async () => {
    const dto = await createLead({
      organizationId: ORG_ID,
      input: {
        customerId: CUSTOMER_ID,
        leadSourceId: SOURCE_WEBSITE.id,
        fullNameSnapshot: "Rahul Sharma",
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const auditEntries = await repository.listAuditLog(dto.id);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("LeadCreated");
  });

  it("records an initial Lead Assignment when an assignee is supplied", async () => {
    const dto = await createLead({
      organizationId: ORG_ID,
      input: {
        customerId: CUSTOMER_ID,
        leadSourceId: SOURCE_WEBSITE.id,
        currentAssigneeUserId: USER_ID,
        fullNameSnapshot: "Rahul Sharma",
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.currentAssigneeUserId).toBe(USER_ID);
    const history = await repository.listAssignmentHistory(dto.id);
    expect(history).toHaveLength(1);
    expect(history[0]?.assignmentType).toBe("INITIAL");
  });

  it("rejects a Lead for a non-existent Customer", async () => {
    await expect(
      createLead({
        organizationId: ORG_ID,
        input: {
          customerId: "does-not-exist",
          leadSourceId: SOURCE_WEBSITE.id,
          fullNameSnapshot: "Rahul Sharma",
        },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidCustomerReferenceError);
  });

  it("rejects a Lead for a non-existent Lead Source", async () => {
    await expect(
      createLead({
        organizationId: ORG_ID,
        input: {
          customerId: CUSTOMER_ID,
          leadSourceId: "does-not-exist",
          fullNameSnapshot: "Rahul Sharma",
        },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidLeadSourceReferenceError);
  });

  it("rejects an initial assignment to a non-existent or inactive User", async () => {
    await expect(
      createLead({
        organizationId: ORG_ID,
        input: {
          customerId: CUSTOMER_ID,
          leadSourceId: SOURCE_WEBSITE.id,
          currentAssigneeUserId: "does-not-exist",
          fullNameSnapshot: "Rahul Sharma",
        },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidAssigneeReferenceError);
  });
});
