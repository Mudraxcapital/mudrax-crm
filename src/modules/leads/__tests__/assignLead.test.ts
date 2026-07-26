import { beforeEach, describe, expect, it } from "vitest";
import { makeAssignLead } from "../application/use-cases/assignLead";
import { InvalidAssigneeReferenceError } from "../domain/errors/LeadErrors";
import { FakeLeadRepository } from "./fakeLeadRepository";
import {
  FakeLeadCatalogRepository,
  ORG_ID,
  SOURCE_WEBSITE,
  STAGE_NEW,
} from "./fakeLeadCatalogRepository";
import { FakeUserLookupPort } from "./fakeLookupPorts";

const USER_A = "user-a";
const USER_B = "user-b";

describe("assignLead", () => {
  let repository: FakeLeadRepository;
  let catalogRepository: FakeLeadCatalogRepository;
  let userLookup: FakeUserLookupPort;
  let assignLead: ReturnType<typeof makeAssignLead>;
  let leadId: string;

  beforeEach(async () => {
    repository = new FakeLeadRepository();
    catalogRepository = new FakeLeadCatalogRepository();
    userLookup = new FakeUserLookupPort();
    userLookup.users.set(USER_A, { id: USER_A, organizationId: ORG_ID, status: "ACTIVE" });
    userLookup.users.set(USER_B, { id: USER_B, organizationId: ORG_ID, status: "ACTIVE" });
    assignLead = makeAssignLead(repository, catalogRepository, userLookup);

    const lead = await repository.createWithAudit(
      {
        organizationId: ORG_ID,
        customerId: "customer-1",
        leadSourceId: SOURCE_WEBSITE.id,
        currentStageId: STAGE_NEW.id,
        fullNameSnapshot: "Rahul Sharma",
      },
      { actorType: "USER", actorId: "actor-1" },
    );
    leadId = lead.id;
  });

  it("makes the first assignment an INITIAL assignment", async () => {
    const dto = await assignLead({
      id: leadId,
      input: { assignedToUserId: USER_A },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.currentAssigneeUserId).toBe(USER_A);
    const history = await repository.listAssignmentHistory(leadId);
    expect(history).toHaveLength(1);
    expect(history[0]?.assignmentType).toBe("INITIAL");
  });

  it("closes the prior open assignment and records MANUAL_REASSIGNMENT on reassignment", async () => {
    await assignLead({
      id: leadId,
      input: { assignedToUserId: USER_A },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const dto = await assignLead({
      id: leadId,
      input: { assignedToUserId: USER_B },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.currentAssigneeUserId).toBe(USER_B);
    const history = await repository.listAssignmentHistory(leadId);
    expect(history).toHaveLength(2);
    expect(history[0]?.unassignedAt).not.toBeNull();
    expect(history[1]?.assignmentType).toBe("MANUAL_REASSIGNMENT");
    expect(history[1]?.unassignedAt).toBeNull();
  });

  it("records a LeadAssigned/LeadReassigned Audit Record", async () => {
    const dto = await assignLead({
      id: leadId,
      input: { assignedToUserId: USER_A },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const auditEntries = await repository.listAuditLog(dto.id);
    expect(auditEntries.some((entry) => entry.action === "LeadAssigned")).toBe(true);
  });

  it("rejects assignment to a non-existent User", async () => {
    await expect(
      assignLead({
        id: leadId,
        input: { assignedToUserId: "does-not-exist" },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidAssigneeReferenceError);
  });

  it("clears Manager/Team Lead ownership when assigning a Direct Admin Caller", async () => {
    const freelancer = "freelancer-1";
    userLookup.users.set(freelancer, {
      id: freelancer,
      organizationId: ORG_ID,
      status: "ACTIVE",
      roleName: "Caller",
      assignedTeamLeadId: null,
      reportingManagerId: null,
    });

    // Seed an existing Manager-owned lead, then reassign to freelancer.
    const owned = await repository.createWithAudit(
      {
        organizationId: ORG_ID,
        customerId: "customer-2",
        leadSourceId: SOURCE_WEBSITE.id,
        currentStageId: STAGE_NEW.id,
        fullNameSnapshot: "Freelancer Lead",
        ownerManagerId: "mgr-1",
        ownerTeamLeadId: "tl-1",
      },
      { actorType: "USER", actorId: "actor-1" },
    );

    const dto = await assignLead({
      id: owned.id,
      input: { assignedToUserId: freelancer },
      actor: { actorType: "USER", actorId: "admin-1" },
    });

    expect(dto.currentAssigneeUserId).toBe(freelancer);
    expect(dto.ownerManagerId).toBeNull();
    expect(dto.ownerTeamLeadId).toBeNull();
  });
});
