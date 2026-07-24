import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateBranch } from "../application/use-cases/createBranch";
import { makeUpdateBranch } from "../application/use-cases/updateBranch";
import { createBranchSchema, updateBranchSchema } from "../application/validators/branchSchemas";
import { BranchNotFoundError, DuplicateBranchCodeError } from "../domain/errors/BranchErrors";
import { FakeBranchRepository } from "./fakeBranchRepository";

const ORG_ID = "org-1";

describe("updateBranch", () => {
  let repository: FakeBranchRepository;
  let createBranch: ReturnType<typeof makeCreateBranch>;
  let updateBranch: ReturnType<typeof makeUpdateBranch>;

  beforeEach(() => {
    repository = new FakeBranchRepository();
    createBranch = makeCreateBranch(repository);
    updateBranch = makeUpdateBranch(repository);
  });

  it("updates only the provided fields and returns the fresh DTO", async () => {
    const created = await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const updated = await updateBranch({
      id: created.id,
      input: updateBranchSchema.parse({ isArchived: true }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(updated.isArchived).toBe(true);
    expect(updated.name).toBe("Mumbai Head Office");
    expect(updated.code).toBe("MUM-HO");
  });

  it("records an Audit Record capturing before/after state", async () => {
    const created = await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await updateBranch({
      id: created.id,
      input: updateBranchSchema.parse({ name: "Mumbai HO (renamed)" }),
      actor: { actorType: "USER", actorId: "actor-2" },
    });

    const auditEntries = await repository.listAuditLog(created.id);
    expect(auditEntries).toHaveLength(2);
    const [createEntry, updateEntry] = auditEntries;
    expect(updateEntry?.action).toBe("BranchUpdated");
    expect(updateEntry?.actorId).toBe("actor-2");
    expect(updateEntry?.beforeState).toMatchObject({ name: "Mumbai Head Office" });
    expect(updateEntry?.afterState).toMatchObject({ name: "Mumbai HO (renamed)" });
    expect(updateEntry?.previousRecordHash).toBe(createEntry?.recordHash);
  });

  it("throws BranchNotFoundError for an unknown id", async () => {
    await expect(
      updateBranch({
        id: "does-not-exist",
        input: updateBranchSchema.parse({ isArchived: true }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(BranchNotFoundError);
  });

  it("rejects renaming the code to one already used by another Branch in the same Organization", async () => {
    const first = await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Branch One", code: "BR-ONE" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Branch Two", code: "BR-TWO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      updateBranch({
        id: first.id,
        input: updateBranchSchema.parse({ code: "BR-TWO" }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateBranchCodeError);
  });

  it("allows updating a Branch to keep its own existing code", async () => {
    const created = await createBranch({
      organizationId: ORG_ID,
      input: createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const updated = await updateBranch({
      id: created.id,
      input: updateBranchSchema.parse({ code: "MUM-HO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(updated.code).toBe("MUM-HO");
  });
});
