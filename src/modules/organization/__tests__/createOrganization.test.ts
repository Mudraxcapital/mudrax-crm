import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateOrganization } from "../application/use-cases/createOrganization";
import { createOrganizationSchema } from "../application/validators/organizationSchemas";
import { DuplicateOrganizationCodeError } from "../domain/errors/OrganizationErrors";
import { FakeOrganizationRepository } from "./fakeOrganizationRepository";

describe("createOrganization", () => {
  let repository: FakeOrganizationRepository;
  let createOrganization: ReturnType<typeof makeCreateOrganization>;

  beforeEach(() => {
    repository = new FakeOrganizationRepository();
    createOrganization = makeCreateOrganization(repository);
  });

  it("creates an Organization and returns its DTO", async () => {
    const input = createOrganizationSchema.parse({ name: "Mudrax Capitals", code: "mudrax" });

    const dto = await createOrganization({
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.name).toBe("Mudrax Capitals");
    expect(dto.code).toBe("MUDRAX");
    expect(dto.status).toBe("ACTIVE");
    expect(dto.timezone).toBe("Asia/Kolkata");
    expect(typeof dto.id).toBe("string");
  });

  it("records an Audit Record for the creation", async () => {
    const input = createOrganizationSchema.parse({ name: "Mudrax Capitals", code: "MUDRAX" });

    const dto = await createOrganization({
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const auditEntries = await repository.listAuditLog(dto.id);
    expect(auditEntries).toHaveLength(1);
    const [entry] = auditEntries;
    expect(entry?.action).toBe("OrganizationCreated");
    expect(entry?.actorType).toBe("USER");
    expect(entry?.actorId).toBe("actor-1");
    expect(entry?.beforeState).toBeNull();
    expect(entry?.afterState).toMatchObject({ code: "MUDRAX" });
  });

  it("rejects a duplicate Organization code", async () => {
    const input = createOrganizationSchema.parse({ name: "Mudrax Capitals", code: "MUDRAX" });
    await createOrganization({ input, actor: { actorType: "USER", actorId: "actor-1" } });

    const duplicateInput = createOrganizationSchema.parse({
      name: "Another Org",
      code: "MUDRAX",
    });

    await expect(
      createOrganization({
        input: duplicateInput,
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateOrganizationCodeError);
  });
});
