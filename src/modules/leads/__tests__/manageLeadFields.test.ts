import { beforeEach, describe, expect, it } from "vitest";
import {
  makeArchiveLeadField,
  makeCreateLeadField,
  makeHideLeadField,
} from "../application/use-cases/manageLeadFields";
import { ProtectedLeadFieldError } from "../domain/errors/LeadFieldErrors";
import { FakeLeadFieldDefinitionRepository } from "./fakeLeadFieldDefinitionRepository";
import { ORG_ID } from "./fakeLeadCatalogRepository";

describe("manageLeadFields", () => {
  let repository: FakeLeadFieldDefinitionRepository;

  beforeEach(() => {
    repository = new FakeLeadFieldDefinitionRepository();
  });

  it("creates a custom field that becomes available immediately", async () => {
    const createLeadField = makeCreateLeadField(repository);
    const created = await createLeadField({
      organizationId: ORG_ID,
      input: {
        name: "Loan Amount",
        fieldType: "CURRENCY",
        fieldGroup: "SECONDARY",
        isRequired: false,
        isVisible: true,
        isSearchable: true,
        isFilterable: true,
        isImportable: true,
        isExportable: true,
      },
      actor: { actorType: "USER", actorId: "admin-1" },
    });

    expect(created.internalKey).toBe("loan_amount");
    expect(created.section).toBe("secondary");
    const listed = await repository.listActive(ORG_ID);
    expect(listed.some((field) => field.internalKey === "loan_amount")).toBe(true);
  });

  it("never archives protected system fields (phone / lead name)", async () => {
    const archiveLeadField = makeArchiveLeadField(repository);
    await repository.ensureSystemDefaults(ORG_ID);
    const phone = await repository.findByInternalKey(ORG_ID, "phone");
    expect(phone).toBeTruthy();

    await expect(
      archiveLeadField({
        id: phone!.id,
        organizationId: ORG_ID,
        actor: { actorType: "USER", actorId: "admin-1" },
      }),
    ).rejects.toBeInstanceOf(ProtectedLeadFieldError);
  });

  it("can hide a system field", async () => {
    const hideLeadField = makeHideLeadField(repository);
    await repository.ensureSystemDefaults(ORG_ID);
    const name = await repository.findByInternalKey(ORG_ID, "full_name");
    const hidden = await hideLeadField({
      id: name!.id,
      organizationId: ORG_ID,
      actor: { actorType: "USER", actorId: "admin-1" },
    });
    expect(hidden.isVisible).toBe(false);
    expect(hidden.section).toBe("hidden");
  });
});
