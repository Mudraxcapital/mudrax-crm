import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateBranch } from "../application/use-cases/createBranch";
import { makeGetBranch, makeListBranches } from "../application/use-cases/getBranch";
import { createBranchSchema } from "../application/validators/branchSchemas";
import { BranchNotFoundError } from "../domain/errors/BranchErrors";
import { FakeBranchRepository } from "./fakeBranchRepository";

const ORG_ID = "org-1";

describe("getBranch / listBranches", () => {
  let repository: FakeBranchRepository;
  let createBranch: ReturnType<typeof makeCreateBranch>;
  let getBranch: ReturnType<typeof makeGetBranch>;
  let listBranches: ReturnType<typeof makeListBranches>;

  beforeEach(() => {
    repository = new FakeBranchRepository();
    createBranch = makeCreateBranch(repository);
    getBranch = makeGetBranch(repository);
    listBranches = makeListBranches(repository);
  });

  it("returns the created Branch by id", async () => {
    const created = await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const found = await getBranch(created.id);
    expect(found).toEqual(created);
  });

  it("throws BranchNotFoundError for an unknown id", async () => {
    await expect(getBranch("missing-id")).rejects.toBeInstanceOf(BranchNotFoundError);
  });

  it("lists every created Branch scoped to its own Organization", async () => {
    await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Branch One", code: "BR-ONE" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Branch Two", code: "BR-TWO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createBranch({
      organizationId: "org-2",
      input: createBranchSchema.parse({ name: "Other Org Branch", code: "OTHER" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const all = await listBranches(ORG_ID);
    expect(all).toHaveLength(2);
    expect(all.map((branch) => branch.code).sort()).toEqual(["BR-ONE", "BR-TWO"]);
  });
});
