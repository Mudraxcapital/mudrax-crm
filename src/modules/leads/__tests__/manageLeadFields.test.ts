import { beforeEach, describe, expect, it } from "vitest";
import {
  makeArchiveLeadField,
  makeCreateLeadField,
  makeHideLeadField,
  makeShowLeadField,
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

  it("rejects hiding protected core fields", async () => {
    const hideLeadField = makeHideLeadField(repository);
    await repository.ensureSystemDefaults(ORG_ID);
    const name = await repository.findByInternalKey(ORG_ID, "full_name");

    await expect(
      hideLeadField({
        id: name!.id,
        organizationId: ORG_ID,
        actor: { actorType: "USER", actorId: "admin-1" },
      }),
    ).rejects.toBeInstanceOf(ProtectedLeadFieldError);
  });

  it("hides a custom field while preserving its field group on unhide", async () => {
    const createLeadField = makeCreateLeadField(repository);
    const hideLeadField = makeHideLeadField(repository);
    const showLeadField = makeShowLeadField(repository);

    const created = await createLeadField({
      organizationId: ORG_ID,
      input: {
        name: "City",
        fieldType: "TEXT",
        fieldGroup: "PRIMARY",
        isRequired: false,
        isVisible: true,
        isSearchable: false,
        isFilterable: false,
        isImportable: true,
        isExportable: true,
      },
      actor: { actorType: "USER", actorId: "admin-1" },
    });

    const hidden = await hideLeadField({
      id: created.id,
      organizationId: ORG_ID,
      actor: { actorType: "USER", actorId: "admin-1" },
    });
    expect(hidden.isVisible).toBe(false);
    expect(hidden.fieldGroup).toBe("PRIMARY");
    expect(hidden.section).toBe("hidden");

    const shown = await showLeadField({
      id: created.id,
      organizationId: ORG_ID,
      actor: { actorType: "USER", actorId: "admin-1" },
    });
    expect(shown.isVisible).toBe(true);
    expect(shown.fieldGroup).toBe("PRIMARY");
    expect(shown.section).toBe("primary");
  });
});
