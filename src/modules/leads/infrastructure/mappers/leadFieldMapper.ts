import type {
  CustomFieldDefinition as PrismaField,
  LeadCustomFieldValue as PrismaValue,
  CustomFieldType as PrismaFieldType,
} from "@prisma/client";
import {
  normalizeLeadFieldType,
  type LeadFieldDefinition,
  type LeadFieldGroup,
  type LeadFieldStatus,
  type LeadFieldValidationRules,
  type LeadFieldValue,
  type SystemLeadColumn,
} from "../../domain/entities/LeadFieldDefinition";

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string");
}

function asValidationRules(value: unknown): LeadFieldValidationRules | null {
  if (!value || typeof value !== "object") return null;
  return value as LeadFieldValidationRules;
}

function asSystemColumn(value: string | null): SystemLeadColumn | null {
  if (
    value === "fullNameSnapshot" ||
    value === "phoneSnapshot" ||
    value === "emailSnapshot"
  ) {
    return value;
  }
  return null;
}

export function toLeadFieldDefinition(row: PrismaField): LeadFieldDefinition {
  const status = (row.status as LeadFieldStatus) ?? (row.isActive ? "ACTIVE" : "INACTIVE");
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    internalKey: row.internalKey,
    fieldType: normalizeLeadFieldType(row.dataType),
    fieldGroup: row.fieldGroup as LeadFieldGroup,
    status,
    isSystem: row.isSystem,
    isRequired: row.isRequired,
    isVisible: row.isVisible,
    isSearchable: row.isSearchable,
    isFilterable: row.isFilterable,
    isImportable: row.isImportable,
    isExportable: row.isExportable,
    defaultValue: row.defaultValue,
    validationRules: asValidationRules(row.validationRules),
    selectOptions: asStringArray(row.selectOptions),
    displayOrder: row.displayOrder,
    systemColumn: asSystemColumn(row.systemColumn),
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPrismaFieldType(fieldType: string): PrismaFieldType {
  if (fieldType === "DROPDOWN") {
    // Prefer DROPDOWN; fall back handled by DB after enum expansion.
    return "DROPDOWN" as PrismaFieldType;
  }
  return fieldType as PrismaFieldType;
}

export function toLeadFieldValue(
  row: PrismaValue & { customFieldDefinition?: { internalKey: string } | null },
): LeadFieldValue {
  const raw =
    row.valueText ??
    row.valueSelectOption ??
    (row.valueNumber != null ? String(row.valueNumber) : null) ??
    (row.valueBoolean != null ? String(row.valueBoolean) : null) ??
    (row.valueDate ? row.valueDate.toISOString().slice(0, 10) : null) ??
    (row.valueDateTime ? row.valueDateTime.toISOString() : null);

  return {
    fieldDefinitionId: row.customFieldDefinitionId,
    internalKey: row.customFieldDefinition?.internalKey ?? row.customFieldDefinitionId,
    rawValue: raw,
    valueText: row.valueText,
    valueNumber: row.valueNumber != null ? Number(row.valueNumber) : null,
    valueDate: row.valueDate,
    valueDateTime: row.valueDateTime,
    valueBoolean: row.valueBoolean,
    valueSelectOption: row.valueSelectOption,
    valueJson: row.valueJson,
  };
}
