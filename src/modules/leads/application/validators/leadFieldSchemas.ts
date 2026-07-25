// ============================================================================
// Zod schemas for Lead Field Definition management + dynamic value validation.
// ============================================================================

import { z } from "zod";
import {
  LEAD_FIELD_GROUPS,
  LEAD_FIELD_STATUSES,
  LEAD_FIELD_TYPES,
  type LeadFieldDefinition,
  type LeadFieldType,
  type LeadFieldValidationRules,
} from "../../domain/entities/LeadFieldDefinition";

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const leadFieldValidationRulesSchema = z
  .object({
    minLength: z.number().int().min(0).max(10000).optional(),
    maxLength: z.number().int().min(1).max(10000).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().trim().max(500).optional(),
    patternMessage: z.string().trim().max(300).optional(),
  })
  .strict();

export const createLeadFieldSchema = z.object({
  name: z.string().trim().min(1).max(100),
  internalKey: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, "Internal key must be snake_case starting with a letter.")
    .optional(),
  fieldType: z.enum(LEAD_FIELD_TYPES),
  fieldGroup: z.enum(LEAD_FIELD_GROUPS).default("SECONDARY"),
  isRequired: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  isSearchable: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  isImportable: z.boolean().default(true),
  isExportable: z.boolean().default(true),
  defaultValue: z.string().trim().max(4000).nullable().optional(),
  validationRules: leadFieldValidationRulesSchema.nullable().optional(),
  selectOptions: z.array(z.string().trim().min(1).max(150)).max(200).optional(),
  displayOrder: z.number().int().min(0).max(100000).optional(),
});

export const updateLeadFieldSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  fieldType: z.enum(LEAD_FIELD_TYPES).optional(),
  fieldGroup: z.enum(LEAD_FIELD_GROUPS).optional(),
  status: z.enum(LEAD_FIELD_STATUSES).optional(),
  isRequired: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
  isImportable: z.boolean().optional(),
  isExportable: z.boolean().optional(),
  defaultValue: z.string().trim().max(4000).nullable().optional(),
  validationRules: leadFieldValidationRulesSchema.nullable().optional(),
  selectOptions: z.array(z.string().trim().min(1).max(150)).max(200).optional(),
  displayOrder: z.number().int().min(0).max(100000).optional(),
});

export const reorderLeadFieldsSchema = z.object({
  orderedIds: z.array(uuidSchema).min(1).max(500),
});

export type CreateLeadFieldInput = z.infer<typeof createLeadFieldSchema>;
export type UpdateLeadFieldInput = z.infer<typeof updateLeadFieldSchema>;
export type ReorderLeadFieldsInput = z.infer<typeof reorderLeadFieldsSchema>;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function asString(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join("|");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "";
  return String(value).trim();
}

function validateOneField(
  field: LeadFieldDefinition,
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const label = field.name;
  const rules: LeadFieldValidationRules | null = field.validationRules;
  const blank = isBlank(raw) || (Array.isArray(raw) && raw.length === 0);

  if (blank) {
    if (field.isRequired) {
      return { ok: false, error: `${label} is required.` };
    }
    return { ok: true, value: field.defaultValue ?? null };
  }

  const text = asString(raw);

  switch (field.fieldType as LeadFieldType) {
    case "EMAIL": {
      const result = z.email(`${label} must be a valid email.`).max(320).safeParse(text);
      if (!result.success) return { ok: false, error: result.error.issues[0]?.message ?? `${label} is invalid.` };
      break;
    }
    case "URL": {
      const result = z.url(`${label} must be a valid URL.`).max(2000).safeParse(text);
      if (!result.success) return { ok: false, error: result.error.issues[0]?.message ?? `${label} is invalid.` };
      break;
    }
    case "NUMBER":
    case "CURRENCY": {
      const num = Number(text);
      if (!Number.isFinite(num)) return { ok: false, error: `${label} must be a number.` };
      if (rules?.min != null && num < rules.min) {
        return { ok: false, error: `${label} must be at least ${rules.min}.` };
      }
      if (rules?.max != null && num > rules.max) {
        return { ok: false, error: `${label} must be at most ${rules.max}.` };
      }
      return { ok: true, value: String(num) };
    }
    case "DATE":
    case "DATE_TIME": {
      if (Number.isNaN(Date.parse(text))) {
        return { ok: false, error: `${label} must be a valid date.` };
      }
      break;
    }
    case "BOOLEAN":
    case "CHECKBOX": {
      const normalized = text.toLowerCase();
      if (!["true", "false", "1", "0", "yes", "no", "on"].includes(normalized)) {
        return { ok: false, error: `${label} must be true or false.` };
      }
      const truthy = ["true", "1", "yes", "on"].includes(normalized);
      if (field.isRequired && !truthy) {
        return { ok: false, error: `${label} is required.` };
      }
      return { ok: true, value: truthy ? "true" : "false" };
    }
    case "DROPDOWN":
    case "RADIO": {
      const options = field.selectOptions ?? [];
      if (options.length > 0 && !options.includes(text)) {
        return { ok: false, error: `${label} must be one of the configured options.` };
      }
      break;
    }
    case "MULTI_SELECT": {
      const parts = Array.isArray(raw)
        ? raw.map(String)
        : text.split("|").map((part) => part.trim()).filter(Boolean);
      const options = new Set(field.selectOptions ?? []);
      if (field.isRequired && parts.length === 0) {
        return { ok: false, error: `${label} is required.` };
      }
      if (options.size > 0 && parts.some((part) => !options.has(part))) {
        return { ok: false, error: `${label} contains an invalid option.` };
      }
      return { ok: true, value: parts.join("|") };
    }
    default:
      break;
  }

  if (rules?.minLength != null && text.length < rules.minLength) {
    return { ok: false, error: `${label} is too short.` };
  }
  if (rules?.maxLength != null && text.length > rules.maxLength) {
    return { ok: false, error: `${label} is too long.` };
  }
  if (rules?.pattern) {
    try {
      const re = new RegExp(rules.pattern);
      if (!re.test(text)) {
        return { ok: false, error: rules.patternMessage ?? `${label} is invalid.` };
      }
    } catch {
      // Ignore invalid admin-supplied regex.
    }
  }

  return { ok: true, value: text };
}

/**
 * Validate a map of internalKey → raw values against active field defs.
 * Returns normalized string values (multi-select joined by `|`).
 */
export function validateLeadFieldValues(
  fields: LeadFieldDefinition[],
  values: Record<string, unknown>,
  options?: { onlyKeys?: string[] },
): { ok: true; values: Record<string, string | null> } | { ok: false; error: string } {
  const active = fields.filter((field) => field.status === "ACTIVE");
  const target = options?.onlyKeys
    ? active.filter((field) => options.onlyKeys!.includes(field.internalKey))
    : active;

  const normalized: Record<string, string | null> = {};
  for (const field of target) {
    const result = validateOneField(field, values[field.internalKey]);
    if (!result.ok) return result;
    normalized[field.internalKey] = result.value;
  }

  return { ok: true, values: normalized };
}
