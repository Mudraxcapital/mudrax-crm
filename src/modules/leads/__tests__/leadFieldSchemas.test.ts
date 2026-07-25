import { describe, expect, it } from "vitest";
import {
  createLeadFieldSchema,
  validateLeadFieldValues,
} from "../application/validators/leadFieldSchemas";
import type { LeadFieldDefinition } from "../domain/entities/LeadFieldDefinition";

const baseField = (overrides: Partial<LeadFieldDefinition>): LeadFieldDefinition => ({
  id: "f1",
  organizationId: "org",
  name: "PAN Number",
  internalKey: "pan_number",
  fieldType: "TEXT",
  fieldGroup: "SECONDARY",
  status: "ACTIVE",
  isSystem: false,
  isRequired: true,
  isVisible: true,
  isSearchable: true,
  isFilterable: true,
  isImportable: true,
  isExportable: true,
  defaultValue: null,
  validationRules: { pattern: "^[A-Z]{5}[0-9]{4}[A-Z]$", patternMessage: "Invalid PAN" },
  selectOptions: null,
  displayOrder: 50,
  systemColumn: null,
  createdByUserId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("createLeadFieldSchema", () => {
  it("accepts a custom field definition", () => {
    const result = createLeadFieldSchema.safeParse({
      name: "CIBIL Score",
      fieldType: "NUMBER",
      isFilterable: true,
      isSearchable: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid internal keys", () => {
    const result = createLeadFieldSchema.safeParse({
      name: "Bad",
      internalKey: "Bad Key",
      fieldType: "TEXT",
    });
    expect(result.success).toBe(false);
  });
});

describe("validateLeadFieldValues", () => {
  it("enforces configured validation rules", () => {
    const fields = [baseField({})];
    const ok = validateLeadFieldValues(fields, { pan_number: "ABCDE1234F" });
    expect(ok.ok).toBe(true);

    const bad = validateLeadFieldValues(fields, { pan_number: "invalid" });
    expect(bad.ok).toBe(false);
  });

  it("requires configured required fields", () => {
    const fields = [baseField({ isRequired: true })];
    const result = validateLeadFieldValues(fields, {});
    expect(result.ok).toBe(false);
  });
});
