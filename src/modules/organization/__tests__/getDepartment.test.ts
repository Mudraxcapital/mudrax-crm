import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateDepartment } from "../application/use-cases/createDepartment";
import { makeGetDepartment, makeListDepartments } from "../application/use-cases/getDepartment";
import { createDepartmentSchema } from "../application/validators/departmentSchemas";
import { DepartmentNotFoundError } from "../domain/errors/DepartmentErrors";
import { FakeDepartmentRepository } from "./fakeDepartmentRepository";

const ORG_ID = "org-1";

describe("getDepartment / listDepartments", () => {
  let repository: FakeDepartmentRepository;
  let createDepartment: ReturnType<typeof makeCreateDepartment>;
  let getDepartment: ReturnType<typeof makeGetDepartment>;
  let listDepartments: ReturnType<typeof makeListDepartments>;

  beforeEach(() => {
    repository = new FakeDepartmentRepository();
    createDepartment = makeCreateDepartment(repository);
    getDepartment = makeGetDepartment(repository);
    listDepartments = makeListDepartments(repository);
  });

  it("returns the created Department by id", async () => {
    const created = await createDepartment({
      organizationId: ORG_ID,
      input: createDepartmentSchema.parse({ name: "Sales", code: "SALES" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const found = await getDepartment(created.id);
    expect(found).toEqual(created);
  });

  it("throws DepartmentNotFoundError for an unknown id", async () => {
    await expect(getDepartment("missing-id")).rejects.toBeInstanceOf(DepartmentNotFoundError);
  });

  it("lists every created Department scoped to its own Organization", async () => {
    await createDepartment({
      organizationId: ORG_ID,
      input: createDepartmentSchema.parse({ name: "Dept One", code: "DEPT-ONE" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createDepartment({
      organizationId: ORG_ID,
      input: createDepartmentSchema.parse({ name: "Dept Two", code: "DEPT-TWO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createDepartment({
      organizationId: "org-2",
      input: createDepartmentSchema.parse({ name: "Other Org Dept", code: "OTHER" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const all = await listDepartments(ORG_ID);
    expect(all).toHaveLength(2);
    expect(all.map((department) => department.code).sort()).toEqual(["DEPT-ONE", "DEPT-TWO"]);
  });
});
