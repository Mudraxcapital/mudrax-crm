import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateOrganization } from "../application/use-cases/createOrganization";
import { makeUpdateOrganization } from "../application/use-cases/updateOrganization";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from "../application/validators/organizationSchemas";
import {
  DuplicateOrganizationCodeError,
  OrganizationNotFoundError,
} from "../domain/errors/OrganizationErrors";
import { FakeOrganizationRepository } from "./fakeOrganizationRepository";

describe("updateOrganization", () => {
  let repository: FakeOrganizationRepository;
  let createOrganization: ReturnType<typeof makeCreateOrganization>;
  let updateOrganization: ReturnType<typeof makeUpdateOrganization>;

  beforeEach(() => {
    repository = new FakeOrganizationRepository();
    createOrganization = makeCreateOrganization(repository);
    updateOrganization = makeUpdateOrganization(repository);
  });

  it("updates only the provided fields and returns the fresh DTO", async () => {
    const created = await createOrganization({
      input: createOrganizationSchema.parse({ name: "Mudrax Capitals", code: "MUDRAX" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const updated = await updateOrganization({
      id: created.id,
      input: updateOrganizationSchema.parse({ status: "SUSPENDED" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(updated.status).toBe("SUSPENDED");
    expect(updated.name).toBe("Mudrax Capitals");
    expect(updated.code).toBe("MUDRAX");
  });

  it("records an Audit Record capturing before/after state", async () => {
    const created = await createOrganization({
      input: createOrganizationSchema.parse({ name: "Mudrax Capitals", code: "MUDRAX" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await updateOrganization({
      id: created.id,
      input: updateOrganizationSchema.parse({ name: "Mudrax Capitals Pvt Ltd" }),
      actor: { actorType: "USER", actorId: "actor-2" },
    });

    const auditEntries = await repository.listAuditLog(created.id);
    expect(auditEntries).toHaveLength(2);
    const [createEntry, updateEntry] = auditEntries;
    expect(updateEntry?.action).toBe("OrganizationUpdated");
    expect(updateEntry?.actorId).toBe("actor-2");
    expect(updateEntry?.beforeState).toMatchObject({ name: "Mudrax Capitals" });
    expect(updateEntry?.afterState).toMatchObject({ name: "Mudrax Capitals Pvt Ltd" });
    expect(updateEntry?.previousRecordHash).toBe(createEntry?.recordHash);
  });

  it("throws OrganizationNotFoundError for an unknown id", async () => {
    await expect(
      updateOrganization({
        id: "does-not-exist",
        input: updateOrganizationSchema.parse({ status: "SUSPENDED" }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(OrganizationNotFoundError);
  });

  it("rejects renaming the code to one already used by another Organization", async () => {
    const first = await createOrganization({
      input: createOrganizationSchema.parse({ name: "Org One", code: "ORG-ONE" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createOrganization({
      input: createOrganizationSchema.parse({ name: "Org Two", code: "ORG-TWO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      updateOrganization({
        id: first.id,
        input: updateOrganizationSchema.parse({ code: "ORG-TWO" }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateOrganizationCodeError);
  });

  it("allows updating an Organization to keep its own existing code", async () => {
    const created = await createOrganization({
      input: createOrganizationSchema.parse({ name: "Mudrax Capitals", code: "MUDRAX" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const updated = await updateOrganization({
      id: created.id,
      input: updateOrganizationSchema.parse({ code: "MUDRAX" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(updated.code).toBe("MUDRAX");
  });
});
