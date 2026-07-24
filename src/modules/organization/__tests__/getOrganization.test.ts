import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateOrganization } from "../application/use-cases/createOrganization";
import {
  makeGetOrganization,
  makeListOrganizations,
} from "../application/use-cases/getOrganization";
import { createOrganizationSchema } from "../application/validators/organizationSchemas";
import { OrganizationNotFoundError } from "../domain/errors/OrganizationErrors";
import { FakeOrganizationRepository } from "./fakeOrganizationRepository";

describe("getOrganization / listOrganizations", () => {
  let repository: FakeOrganizationRepository;
  let createOrganization: ReturnType<typeof makeCreateOrganization>;
  let getOrganization: ReturnType<typeof makeGetOrganization>;
  let listOrganizations: ReturnType<typeof makeListOrganizations>;

  beforeEach(() => {
    repository = new FakeOrganizationRepository();
    createOrganization = makeCreateOrganization(repository);
    getOrganization = makeGetOrganization(repository);
    listOrganizations = makeListOrganizations(repository);
  });

  it("returns the created Organization by id", async () => {
    const created = await createOrganization({
      input: createOrganizationSchema.parse({ name: "Mudrax Capitals", code: "MUDRAX" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const found = await getOrganization(created.id);
    expect(found).toEqual(created);
  });

  it("throws OrganizationNotFoundError for an unknown id", async () => {
    await expect(getOrganization("missing-id")).rejects.toBeInstanceOf(OrganizationNotFoundError);
  });

  it("lists every created Organization", async () => {
    await createOrganization({
      input: createOrganizationSchema.parse({ name: "Org One", code: "ORG-ONE" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await createOrganization({
      input: createOrganizationSchema.parse({ name: "Org Two", code: "ORG-TWO" }),
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const all = await listOrganizations();
    expect(all).toHaveLength(2);
    expect(all.map((org) => org.code).sort()).toEqual(["ORG-ONE", "ORG-TWO"]);
  });
});
