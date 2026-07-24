import { describe, expect, it } from "vitest";
import {
  createCustomerSchema,
  identifierInputSchema,
} from "../application/validators/customerSchemas";

describe("identifierInputSchema", () => {
  it("accepts a well-formed PAN", () => {
    const result = identifierInputSchema.safeParse({ type: "PAN", value: "ABCPS1234D" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed PAN", () => {
    const result = identifierInputSchema.safeParse({ type: "PAN", value: "12345" });
    expect(result.success).toBe(false);
  });

  it("accepts a 12-digit Aadhaar", () => {
    const result = identifierInputSchema.safeParse({ type: "AADHAAR", value: "123412341234" });
    expect(result.success).toBe(true);
  });

  it("rejects an Aadhaar that is not 12 digits", () => {
    const result = identifierInputSchema.safeParse({ type: "AADHAAR", value: "12345" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = identifierInputSchema.safeParse({ type: "EMAIL", value: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("createCustomerSchema", () => {
  it("requires at least one identifier", () => {
    const result = createCustomerSchema.safeParse({ fullName: "Rahul Sharma", identifiers: [] });
    expect(result.success).toBe(false);
  });

  it("accepts a valid Customer with one identifier", () => {
    const result = createCustomerSchema.safeParse({
      fullName: "Rahul Sharma",
      identifiers: [{ type: "PHONE", value: "+919876543210" }],
    });
    expect(result.success).toBe(true);
  });
});
