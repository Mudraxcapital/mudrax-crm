// ============================================================================
// Helpers to coerce validated field strings into repository value rows and
// to project system-column updates onto the Lead aggregate.
// ============================================================================

import type {
  LeadFieldDefinition,
  LeadFieldValue,
  SystemLeadColumn,
} from "../../domain/entities/LeadFieldDefinition";
import type { UpsertLeadFieldValueData } from "../../domain/repositories/LeadFieldDefinitionRepository";

export function coerceFieldValue(
  field: LeadFieldDefinition,
  raw: string | null,
): UpsertLeadFieldValueData {
  const base = { fieldDefinitionId: field.id };
  if (raw == null || raw === "") {
    return {
      ...base,
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueDateTime: null,
      valueBoolean: null,
      valueSelectOption: null,
      valueJson: null,
    };
  }

  switch (field.fieldType) {
    case "NUMBER":
    case "CURRENCY": {
      const num = Number(raw);
      return { ...base, valueNumber: Number.isFinite(num) ? num : null, valueText: raw };
    }
    case "DATE": {
      const date = new Date(raw);
      return {
        ...base,
        valueDate: Number.isNaN(date.getTime()) ? null : date,
        valueText: raw,
      };
    }
    case "DATE_TIME": {
      const date = new Date(raw);
      return {
        ...base,
        valueDateTime: Number.isNaN(date.getTime()) ? null : date,
        valueText: raw,
      };
    }
    case "BOOLEAN":
    case "CHECKBOX": {
      const truthy = ["true", "1", "yes", "on"].includes(raw.toLowerCase());
      return { ...base, valueBoolean: truthy, valueText: truthy ? "true" : "false" };
    }
    case "DROPDOWN":
    case "RADIO":
      return { ...base, valueSelectOption: raw, valueText: raw };
    case "MULTI_SELECT": {
      const parts = raw.split("|").map((part) => part.trim()).filter(Boolean);
      return { ...base, valueJson: parts, valueText: parts.join("|") };
    }
    case "FILE":
      return { ...base, valueJson: { fileName: raw }, valueText: raw };
    default:
      return { ...base, valueText: raw };
  }
}

export function extractSystemColumnUpdates(
  fields: LeadFieldDefinition[],
  values: Record<string, string | null>,
): Partial<Record<SystemLeadColumn, string | null>> {
  const updates: Partial<Record<SystemLeadColumn, string | null>> = {};
  for (const field of fields) {
    if (!field.systemColumn) continue;
    if (!(field.internalKey in values)) continue;
    updates[field.systemColumn] = values[field.internalKey] ?? null;
  }
  return updates;
}

export function displayFieldValue(value: LeadFieldValue | undefined): string {
  if (!value) return "";
  if (value.valueSelectOption) return value.valueSelectOption;
  if (value.valueBoolean != null) return value.valueBoolean ? "Yes" : "No";
  if (value.valueNumber != null) return String(value.valueNumber);
  if (value.valueDate) return value.valueDate.toISOString().slice(0, 10);
  if (value.valueDateTime) return value.valueDateTime.toISOString();
  if (Array.isArray(value.valueJson)) return value.valueJson.join(", ");
  if (value.valueText) return value.valueText;
  return value.rawValue ?? "";
}

export function valuesByInternalKey(
  values: LeadFieldValue[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const value of values) {
    map[value.internalKey] = displayFieldValue(value);
  }
  return map;
}

export function partitionSystemAndCustom(
  fields: LeadFieldDefinition[],
  values: Record<string, string | null>,
): {
  systemUpdates: Partial<Record<SystemLeadColumn, string | null>>;
  customValues: UpsertLeadFieldValueData[];
} {
  const systemUpdates = extractSystemColumnUpdates(fields, values);
  const customValues: UpsertLeadFieldValueData[] = [];
  for (const field of fields) {
    if (field.systemColumn) continue;
    if (!(field.internalKey in values)) continue;
    customValues.push(coerceFieldValue(field, values[field.internalKey] ?? null));
  }
  return { systemUpdates, customValues };
}
