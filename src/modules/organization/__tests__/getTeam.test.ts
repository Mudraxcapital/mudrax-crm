import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateTeam } from "../application/use-cases/createTeam";
import { makeGetTeam, makeListTeams } from "../application/use-cases/getTeam";
import { createTeamSchema } from "../application/validators/teamSchemas";
import { TeamNotFoundError } from "../domain/errors/TeamErrors";
import { FakeBranchRepository } from "./fakeBranchRepository";
import { FakeTeamRepository } from "./fakeTeamRepository";

const ORG_ID = "org-1";

describe("getTeam / listTeams", () => {
  let teamRepository: FakeTeamRepository;
  let branchRepository: FakeBranchRepository;
  let createTeam: ReturnType<typeof makeCreateTeam>;
  let getTeam: ReturnType<typeof makeGetTeam>;
  let listTeams: ReturnType<typeof makeListTeams>;

  beforeEach(() => {
    teamRepository = new FakeTeamRepository();
    branchRepository = new FakeBranchRepository();
    createTeam = makeCreateTeam(teamRepository, branchRepository);
    getTeam = makeGetTeam(teamRepository);
    listTeams = makeListTeams(teamRepository);
  });

  it("returns the created Team by id", async () => {
    const created = await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({ name: "Mumbai Sales Team", code: "MUM-SALES" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const found = await getTeam(created.id);
    expect(found).toEqual(created);
  });

  it("throws TeamNotFoundError for an unknown id", async () => {
    await expect(getTeam("missing-id")).rejects.toBeInstanceOf(TeamNotFoundError);
  });

  it("lists every created Team scoped to its own Organization", async () => {
    await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({ name: "Team One", code: "TEAM-ONE" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createTeam({
      organizationId: ORG_ID,
      input: createTeamSchema.parse({ name: "Team Two", code: "TEAM-TWO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createTeam({
      organizationId: "org-2",
      input: createTeamSchema.parse({ name: "Other Org Team", code: "OTHER" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const all = await listTeams(ORG_ID);
    expect(all).toHaveLength(2);
    expect(all.map((team) => team.code).sort()).toEqual(["TEAM-ONE", "TEAM-TWO"]);
  });
});
