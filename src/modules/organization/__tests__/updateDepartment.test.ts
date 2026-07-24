import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateDepartment } from "../application/use-cases/createDepartment";
import { makeUpdateDepartment } from "../application/use-cases/updateDepartment";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../application/validators/departmentSchemas";
import {
  DepartmentNotFoundError,
  DuplicateDepartmentCodeError,
} from "../domain/errors/DepartmentErrors";
import { FakeDepartmentRepository } from "./fakeDepartmentRepository";

const ORG_ID = "org-1";

describe("updateDepartment", () => {
  let repository: FakeDepartmentRepository;
  let createDepartment: ReturnType<typeof makeCreateDepartment>;
  let updateDepartment: ReturnType<typeof makeUpdateDepartment>;

  beforeEach(() => {
    repository = new FakeDepartmentRepository();
    createDepartment = makeCreateDepartment(repository);
    updateDepartment = makeUpdateDepartment(repository);
  });

  it("updates only the provided fields and returns the fresh DTO", async () => {
    const created = await createDepartment({
      organizationId: ORG_ID,
      input: createDepartmentSchema.parse({ name: "Sales", code: "SALES" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const updated = await updateDepartment({
      id: created.id,
      input: updateDepartmentSchema.parse({ isArchived: true }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(updated.isArchived).toBe(true);
    expect(updated.name).toBe("Sales");
  });

  it("records an Audit Record capturing before/after state", async () => {
    const created = await createDepartment({
      organizationId: ORG_ID,
      input: createDepartmentSchema.parse({ name: "Sales", code: "SALES" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await updateDepartment({
      id: created.id,
      input: updateDepartmentSchema.parse({ name: "Sales & Marketing" }),
      actor: { actorType: "USER", actorId: "actor-2" },
    });

    const auditEntries = await repository.listAuditLog(created.id);
    expect(auditEntries).toHaveLength(2);
    const [createEntry, updateEntry] = auditEntries;
    expect(updateEntry?.action).toBe("DepartmentUpdated");
    expect(updateEntry?.beforeState).toMatchObject({ name: "Sales" });
    expect(updateEntry?.afterState).toMatchObject({ name: "Sales & Marketing" });
    expect(updateEntry?.previousRecordHash).toBe(createEntry?.recordHash);
  });

  it("throws DepartmentNotFoundError for an unknown id", async () => {
    await expect(
      updateDepartment({
        id: "does-not-exist",
        input: updateDepartmentSchema.parse({ isArchived: true }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DepartmentNotFoundError);
  });

  it("rejects renaming the code to one already used by another Department", async () => {
    const first = await createDepartment({
      organizationId: ORG_ID,
      input: createDepartmentSchema.parse({ name: "Dept One", code: "DEPT-ONE" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createDepartment({
      organizationId: ORG_ID,
      input: createDepartmentSchema.parse({ name: "Dept Two", code: "DEPT-TWO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      updateDepartment({
        id: first.id,
        input: updateDepartmentSchema.parse({ code: "DEPT-TWO" }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateDepartmentCodeError);
  });
});
