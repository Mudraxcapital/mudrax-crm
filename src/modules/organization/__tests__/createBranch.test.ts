import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateBranch } from "../application/use-cases/createBranch";
import { createBranchSchema } from "../application/validators/branchSchemas";
import { DuplicateBranchCodeError } from "../domain/errors/BranchErrors";
import { FakeBranchRepository } from "./fakeBranchRepository";

const ORG_ID = "org-1";

describe("createBranch", () => {
  let repository: FakeBranchRepository;
  let createBranch: ReturnType<typeof makeCreateBranch>;

  beforeEach(() => {
    repository = new FakeBranchRepository();
    createBranch = makeCreateBranch(repository);
  });

  it("creates a Branch and returns its DTO", async () => {
    const input = createBranchSchema.parse({ name: "Mumbai Head Office", code: "mum-ho" });

    const dto = await createBranch({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.name).toBe("Mumbai Head Office");
    expect(dto.code).toBe("MUM-HO");
    expect(dto.organizationId).toBe(ORG_ID);
    expect(dto.timezone).toBe("Asia/Kolkata");
    expect(dto.isArchived).toBe(false);
    expect(typeof dto.id).toBe("string");
  });

  it("records an Audit Record for the creation", async () => {
    const input = createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" });

    const dto = await createBranch({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const auditEntries = await repository.listAuditLog(dto.id);
    expect(auditEntries).toHaveLength(1);
    const [entry] = auditEntries;
    expect(entry?.action).toBe("BranchCreated");
    expect(entry?.actorType).toBe("USER");
    expect(entry?.actorId).toBe("actor-1");
    expect(entry?.beforeState).toBeNull();
    expect(entry?.afterState).toMatchObject({ code: "MUM-HO" });
  });

  it("rejects a duplicate Branch code within the same Organization", async () => {
    const input = createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" });
    await createBranch({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const duplicateInput = createBranchSchema.parse({ name: "Another Branch", code: "MUM-HO" });

    await expect(
      createBranch({
        organizationId: ORG_ID,
        input: duplicateInput,
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateBranchCodeError);
  });

  it("allows the same Branch code in a different Organization", async () => {
    const input = createBranchSchema.parse({ name: "Mumbai Head Office", code: "MUM-HO" });
    await createBranch({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const dto = await createBranch({
      organizationId: "org-2",
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.organizationId).toBe("org-2");
  });
});
