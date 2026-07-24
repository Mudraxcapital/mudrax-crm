import { describe, expect, it } from "vitest";
import { makeCreateDocumentCategory } from "../application/use-cases/createDocumentCategory";
import { makeUpdateDocumentCategory } from "../application/use-cases/updateDocumentCategory";
import { makeCreateDocumentType } from "../application/use-cases/createDocumentType";
import { DuplicateDocumentCategoryNameError } from "../domain/errors/DocumentErrors";
import {
  FakeDocumentCategoryRepository,
  FakeDocumentTypeRepository,
} from "./fakeDocumentRepositories";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = { actorType: "USER" as const, actorId: "00000000-0000-0000-0000-000000000002" };

describe("Document Category / Type catalogs", () => {
  it("creates and updates a category with audit", async () => {
    const repository = new FakeDocumentCategoryRepository();
    const createDocumentCategory = makeCreateDocumentCategory(repository);
    const updateDocumentCategory = makeUpdateDocumentCategory(repository);

    const created = await createDocumentCategory({
      organizationId: ORG_ID,
      input: { name: "Income Proof" },
      actor: ACTOR,
    });
    expect(created.name).toBe("Income Proof");
    expect(repository.auditLog[0]?.action).toBe("DocumentCategoryCreated");

    const updated = await updateDocumentCategory({
      id: created.id,
      input: { name: "Income", isActive: false },
      actor: ACTOR,
    });
    expect(updated.name).toBe("Income");
    expect(updated.isActive).toBe(false);
  });

  it("rejects duplicate category names", async () => {
    const repository = new FakeDocumentCategoryRepository();
    const createDocumentCategory = makeCreateDocumentCategory(repository);

    await createDocumentCategory({
      organizationId: ORG_ID,
      input: { name: "KYC" },
      actor: ACTOR,
    });

    await expect(
      createDocumentCategory({
        organizationId: ORG_ID,
        input: { name: "KYC" },
        actor: ACTOR,
      }),
    ).rejects.toBeInstanceOf(DuplicateDocumentCategoryNameError);
  });

  it("creates a document type under a category", async () => {
    const categories = new FakeDocumentCategoryRepository();
    const types = new FakeDocumentTypeRepository();
    const createDocumentCategory = makeCreateDocumentCategory(categories);
    const createDocumentType = makeCreateDocumentType(types, categories);

    const category = await createDocumentCategory({
      organizationId: ORG_ID,
      input: { name: "KYC" },
      actor: ACTOR,
    });
    const documentType = await createDocumentType({
      organizationId: ORG_ID,
      input: { documentCategoryId: category.id, name: "Passport" },
      actor: ACTOR,
    });

    expect(documentType.documentCategoryId).toBe(category.id);
    expect(documentType.categoryName).toBe("KYC");
  });
});
