import { describe, expect, it } from "vitest";
import {
  createDocumentCategorySchema,
  createDocumentTypeSchema,
  updateVerificationStatusSchema,
  uploadDocumentSchema,
} from "../application/validators/documentSchemas";

describe("documentSchemas", () => {
  it("accepts a valid upload payload", () => {
    const parsed = uploadDocumentSchema.safeParse({
      documentTypeId: "00000000-0000-0000-0000-000000000010",
      ownerType: "CUSTOMER",
      ownerId: "00000000-0000-0000-0000-000000000011",
      fileName: "pan.pdf",
      mimeType: "application/pdf",
      contentBase64: "aGVsbG8=",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects upload without content", () => {
    const parsed = uploadDocumentSchema.safeParse({
      documentTypeId: "00000000-0000-0000-0000-000000000010",
      ownerType: "LEAD",
      ownerId: "00000000-0000-0000-0000-000000000011",
      fileName: "pan.pdf",
      mimeType: "application/pdf",
      contentBase64: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires rejection reason when rejecting", () => {
    const missing = updateVerificationStatusSchema.safeParse({ status: "REJECTED" });
    expect(missing.success).toBe(false);

    const ok = updateVerificationStatusSchema.safeParse({
      status: "REJECTED",
      rejectionReason: "Illegible scan",
    });
    expect(ok.success).toBe(true);
  });

  it("validates category and type catalog inputs", () => {
    expect(createDocumentCategorySchema.safeParse({ name: "KYC" }).success).toBe(true);
    expect(
      createDocumentTypeSchema.safeParse({
        documentCategoryId: "00000000-0000-0000-0000-000000000010",
        name: "PAN Card",
      }).success,
    ).toBe(true);
  });
});
