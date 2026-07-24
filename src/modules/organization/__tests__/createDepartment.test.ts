import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateDepartment } from "../application/use-cases/createDepartment";
import { createDepartmentSchema } from "../application/validators/departmentSchemas";
import { DuplicateDepartmentCodeError } from "../domain/errors/DepartmentErrors";
import { FakeDepartmentRepository } from "./fakeDepartmentRepository";

const ORG_ID = "org-1";

describe("createDepartment", () => {
  let repository: FakeDepartmentRepository;
  let createDepartment: ReturnType<typeof makeCreateDepartment>;

  beforeEach(() => {
    repository = new FakeDepartmentRepository();
    createDepartment = makeCreateDepartment(repository);
  });

  it("creates a Department and returns its DTO", async () => {
    const input = createDepartmentSchema.parse({ name: "Sales", code: "sales" });

    const dto = await createDepartment({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.name).toBe("Sales");
    expect(dto.code).toBe("SALES");
    expect(dto.organizationId).toBe(ORG_ID);
    expect(dto.isArchived).toBe(false);
    expect(typeof dto.id).toBe("string");
  });

  it("records an Audit Record for the creation", async () => {
    const input = createDepartmentSchema.parse({ name: "Sales", code: "SALES" });

    const dto = await createDepartment({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const auditEntries = await repository.listAuditLog(dto.id);
    expect(auditEntries).toHaveLength(1);
    const [entry] = auditEntries;
    expect(entry?.action).toBe("DepartmentCreated");
    expect(entry?.beforeState).toBeNull();
    expect(entry?.afterState).toMatchObject({ code: "SALES" });
  });

  it("rejects a duplicate Department code within the same Organization", async () => {
    const input = createDepartmentSchema.parse({ name: "Sales", code: "SALES" });
    await createDepartment({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const duplicateInput = createDepartmentSchema.parse({ name: "Sales Team 2", code: "SALES" });

    await expect(
      createDepartment({
        organizationId: ORG_ID,
        input: duplicateInput,
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateDepartmentCodeError);
  });
});
