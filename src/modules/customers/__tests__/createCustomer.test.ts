import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateCustomer } from "../application/use-cases/createCustomer";
import { createCustomerSchema } from "../application/validators/customerSchemas";
import { DuplicateCustomerIdentifierError } from "../domain/errors/CustomerErrors";
import { FakeCustomerRepository } from "./fakeCustomerRepository";

const ORG_ID = "org-1";

describe("createCustomer", () => {
  let repository: FakeCustomerRepository;
  let createCustomer: ReturnType<typeof makeCreateCustomer>;

  beforeEach(() => {
    repository = new FakeCustomerRepository();
    createCustomer = makeCreateCustomer(repository);
  });

  it("creates a Customer with a PAN identifier and DECLARED identity confidence", async () => {
    const input = createCustomerSchema.parse({
      fullName: "Rahul Sharma",
      identifiers: [{ type: "PAN", value: "ABCPS1234D" }],
    });

    const dto = await createCustomer({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.fullName).toBe("Rahul Sharma");
    expect(dto.identityConfidence).toBe("DECLARED");
    expect(dto.identifiers).toHaveLength(1);
    expect(dto.identifiers[0]?.valueMasked).toBe("XXXXXX234D");
  });

  it("creates a Customer with only Phone/Email as UNVERIFIED", async () => {
    const input = createCustomerSchema.parse({
      fullName: "Priya Patel",
      identifiers: [
        { type: "PHONE", value: "+919876543210" },
        { type: "EMAIL", value: "priya@example.com" },
      ],
    });

    const dto = await createCustomer({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.identityConfidence).toBe("UNVERIFIED");
    expect(dto.identifiers).toHaveLength(2);
  });

  it("records an Audit Record for the creation", async () => {
    const input = createCustomerSchema.parse({
      fullName: "Amit Verma",
      identifiers: [{ type: "PAN", value: "CQWPV4321L" }],
    });

    const dto = await createCustomer({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const auditEntries = await repository.listAuditLog(dto.id);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("CustomerCreated");
  });

  it("rejects creating a duplicate Customer with the same PAN", async () => {
    const input = createCustomerSchema.parse({
      fullName: "Rahul Sharma",
      identifiers: [{ type: "PAN", value: "ABCPS1234D" }],
    });
    await createCustomer({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      createCustomer({
        organizationId: ORG_ID,
        input: createCustomerSchema.parse({
          fullName: "Rahul Sharma (duplicate entry attempt)",
          identifiers: [{ type: "PAN", value: "abcps1234d" }],
        }),
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateCustomerIdentifierError);
  });

  it("allows the same PAN to be used across different Organizations", async () => {
    const input = createCustomerSchema.parse({
      fullName: "Rahul Sharma",
      identifiers: [{ type: "PAN", value: "ABCPS1234D" }],
    });
    await createCustomer({
      organizationId: ORG_ID,
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const dto = await createCustomer({
      organizationId: "org-2",
      input,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.fullName).toBe("Rahul Sharma");
  });
});
