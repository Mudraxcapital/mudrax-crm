import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateBranch } from "../application/use-cases/createBranch";
import { makeCreateTeam } from "../application/use-cases/createTeam";
import { createBranchSchema } from "../application/validators/branchSchemas";
import { createTeamSchema } from "../application/validators/teamSchemas";
import { DuplicateTeamCodeError, InvalidBranchReferenceError } from "../domain/errors/TeamErrors";
import { FakeBranchRepository } from "./fakeBranchRepository";
import { FakeTeamRepository } from "./fakeTeamRepository";

const ORG_ID = "org-1";

describe("createTeam", () => {
  let teamRepository: FakeTeamRepository;
  let branchRepository: FakeBranchRepository;
  let createTeam: ReturnType<typeof makeCreateTeam>;
  let createBranch: ReturnType<typeof makeCreateBranch>;

  beforeEach(() => {
    teamRepository = new FakeTeamRepository();
    branchRepository = new FakeBranchRepository();
    createTeam = makeCreateTeam(teamRepository, branchRepository);
    createBranch = makeCreateBranch(branchRepository);
  });

  it("creates a Team without a Branch and returns its DTO", async () => {
    const input = createTeamSchema.parse({ name: "Mumbai Sales Team", code: "mum-sales" });

    const dto = await createTeam({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.name).toBe("Mumbai Sales Team");
    expect(dto.code).toBe("MUM-SALES");
    expect(dto.branchId).toBeNull();
  });

  it("creates a Team scoped to an existing Branch", async () => {
    const branch = await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const dto = await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({
        name: "Mumbai Sales Team",
        code: "MUM-SALES",
        branchId: branch.id,
      }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.branchId).toBe(branch.id);
  });

  it("records an Audit Record for the creation", async () => {
    const input = createTeamSchema.parse({ name: "Mumbai Sales Team", code: "MUM-SALES" });

    const dto = await createTeam({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const auditEntries = await teamRepository.listAuditLog(dto.id);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("TeamCreated");
  });

  it("rejects a duplicate Team code within the same Organization", async () => {
    const input = createTeamSchema.parse({ name: "Mumbai Sales Team", code: "MUM-SALES" });
    await createTeam({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      createTeam({
        organizationId: ORG_ID,
        input: createTeamSchema.parse({ name: "Another Team", code: "MUM-SALES" }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateTeamCodeError);
  });

  it("rejects a branchId that does not reference an existing Branch", async () => {
    const input = createTeamSchema.parse({
      name: "Mumbai Sales Team",
      code: "MUM-SALES",
      branchId: "11111111-1111-1111-1111-111111111111",
    });

    await expect(
      createTeam({
        organizationId: ORG_ID,
        input,
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidBranchReferenceError);
  });

  it("rejects a branchId that belongs to a different Organization", async () => {
    const branch = await createBranch({
      organizationId: "org-2",
      input: createBranchSchema.parse({ name: "Other Org Branch", code: "OTHER" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      createTeam({
        organizationId: ORG_ID,
        input: createTeamSchema.parse({
          name: "Mumbai Sales Team",
          code: "MUM-SALES",
          branchId: branch.id,
        }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidBranchReferenceError);
  });
});
