import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateBranch } from "../application/use-cases/createBranch";
import { makeCreateTeam } from "../application/use-cases/createTeam";
import { makeUpdateTeam } from "../application/use-cases/updateTeam";
import { createBranchSchema } from "../application/validators/branchSchemas";
import { createTeamSchema, updateTeamSchema } from "../application/validators/teamSchemas";
import {
  DuplicateTeamCodeError,
  InvalidBranchReferenceError,
  TeamNotFoundError,
} from "../domain/errors/TeamErrors";
import { FakeBranchRepository } from "./fakeBranchRepository";
import { FakeTeamRepository } from "./fakeTeamRepository";

const ORG_ID = "org-1";

describe("updateTeam", () => {
  let teamRepository: FakeTeamRepository;
  let branchRepository: FakeBranchRepository;
  let createTeam: ReturnType<typeof makeCreateTeam>;
  let updateTeam: ReturnType<typeof makeUpdateTeam>;
  let createBranch: ReturnType<typeof makeCreateBranch>;

  beforeEach(() => {
    teamRepository = new FakeTeamRepository();
    branchRepository = new FakeBranchRepository();
    createTeam = makeCreateTeam(teamRepository, branchRepository);
    updateTeam = makeUpdateTeam(teamRepository, branchRepository);
    createBranch = makeCreateBranch(branchRepository);
  });

  it("updates only the provided fields and returns the fresh DTO", async () => {
    const created = await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({ name: "Mumbai Sales Team", code: "MUM-SALES" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const updated = await updateTeam({
      id: created.id,
      input: updateTeamSchema.parse({ isArchived: true }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(updated.isArchived).toBe(true);
    expect(updated.name).toBe("Mumbai Sales Team");
  });

  it("assigns a Team to an existing Branch", async () => {
    const branch = await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    const created = await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({ name: "Mumbai Sales Team", code: "MUM-SALES" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const updated = await updateTeam({
      id: created.id,
      input: updateTeamSchema.parse({ branchId: branch.id }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(updated.branchId).toBe(branch.id);
  });

  it("clears a Team's Branch assignment", async () => {
    const branch = await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    const created = await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({
        name: "Mumbai Sales Team",
        code: "MUM-SALES",
        branchId: branch.id,
      }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const updated = await updateTeam({
      id: created.id,
      input: updateTeamSchema.parse({ branchId: null }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(updated.branchId).toBeNull();
  });

  it("records an Audit Record capturing before/after state", async () => {
    const created = await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({ name: "Mumbai Sales Team", code: "MUM-SALES" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await updateTeam({
      id: created.id,
      input: updateTeamSchema.parse({ name: "Mumbai Sales Team (renamed)" }),
      actor: { actorType: "USER", actorId: "actor-2" },
    });

    const auditEntries = await teamRepository.listAuditLog(created.id);
    expect(auditEntries).toHaveLength(2);
    const [createEntry, updateEntry] = auditEntries;
    expect(updateEntry?.action).toBe("TeamUpdated");
    expect(updateEntry?.beforeState).toMatchObject({ name: "Mumbai Sales Team" });
    expect(updateEntry?.afterState).toMatchObject({ name: "Mumbai Sales Team (renamed)" });
    expect(updateEntry?.previousRecordHash).toBe(createEntry?.recordHash);
  });

  it("throws TeamNotFoundError for an unknown id", async () => {
    await expect(
      updateTeam({
        id: "does-not-exist",
        input: updateTeamSchema.parse({ isArchived: true }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(TeamNotFoundError);
  });

  it("rejects renaming the code to one already used by another Team", async () => {
    const first = await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({ name: "Team One", code: "TEAM-ONE" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({ name: "Team Two", code: "TEAM-TWO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      updateTeam({
        id: first.id,
        input: updateTeamSchema.parse({ code: "TEAM-TWO" }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateTeamCodeError);
  });

  it("rejects assigning a branchId that does not exist", async () => {
    const created = await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({ name: "Mumbai Sales Team", code: "MUM-SALES" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      updateTeam({
        id: created.id,
        input: updateTeamSchema.parse({ branchId: "11111111-1111-1111-1111-111111111111" }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidBranchReferenceError);
  });
});
