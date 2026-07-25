import type { LeadFieldDefinition, LeadFieldValue } from "../../domain/entities/LeadFieldDefinition";
import { displayFieldValue } from "../services/leadFieldValues";

export interface LeadFieldDefinitionDto {
  id: string;
  organizationId: string;
  name: string;
  internalKey: string;
  fieldType: LeadFieldDefinition["fieldType"];
  fieldGroup: LeadFieldDefinition["fieldGroup"];
  status: LeadFieldDefinition["status"];
  isSystem: boolean;
  isRequired: boolean;
  isVisible: boolean;
  isSearchable: boolean;
  isFilterable: boolean;
  isImportable: boolean;
  isExportable: boolean;
  defaultValue: string | null;
  validationRules: LeadFieldDefinition["validationRules"];
  selectOptions: string[] | null;
  displayOrder: number;
  systemColumn: LeadFieldDefinition["systemColumn"];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Derived section for Field Settings UI. */
  section: "primary" | "secondary" | "hidden" | "inactive";
}

export interface LeadFieldValueDto {
  fieldDefinitionId: string;
  internalKey: string;
  displayValue: string;
  rawValue: string | null;
}

export function toLeadFieldDefinitionDto(field: LeadFieldDefinition): LeadFieldDefinitionDto {
  let section: LeadFieldDefinitionDto["section"] = "secondary";
  if (field.status !== "ACTIVE") {
    section = "inactive";
  } else if (!field.isVisible || field.fieldGroup === "HIDDEN") {
    section = "hidden";
  } else if (field.fieldGroup === "PRIMARY") {
    section = "primary";
  } else {
    section = "secondary";
  }

  return {
    id: field.id,
    organizationId: field.organizationId,
    name: field.name,
    internalKey: field.internalKey,
    fieldType: field.fieldType,
    fieldGroup: field.fieldGroup,
    status: field.status,
    isSystem: field.isSystem,
    isRequired: field.isRequired,
    isVisible: field.isVisible,
    isSearchable: field.isSearchable,
    isFilterable: field.isFilterable,
    isImportable: field.isImportable,
    isExportable: field.isExportable,
    defaultValue: field.defaultValue,
    validationRules: field.validationRules,
    selectOptions: field.selectOptions,
    displayOrder: field.displayOrder,
    systemColumn: field.systemColumn,
    createdByUserId: field.createdByUserId,
    createdAt: field.createdAt.toISOString(),
    updatedAt: field.updatedAt.toISOString(),
    section,
  };
}

export function toLeadFieldValueDto(value: LeadFieldValue): LeadFieldValueDto {
  return {
    fieldDefinitionId: value.fieldDefinitionId,
    internalKey: value.internalKey,
    displayValue: displayFieldValue(value),
    rawValue: value.rawValue,
  };
}

/** Fields that should render on create/edit/detail forms. */
export function visibleFormFields(fields: LeadFieldDefinition[]): LeadFieldDefinition[] {
  return fields
    .filter((field) => field.status === "ACTIVE" && field.isVisible && field.fieldGroup !== "HIDDEN")
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function importableFields(fields: LeadFieldDefinition[]): LeadFieldDefinition[] {
  return fields
    .filter((field) => field.status === "ACTIVE" && field.isImportable)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function exportableFields(fields: LeadFieldDefinition[]): LeadFieldDefinition[] {
  return fields
    .filter((field) => field.status === "ACTIVE" && field.isExportable)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function searchableFields(fields: LeadFieldDefinition[]): LeadFieldDefinition[] {
  return fields.filter((field) => field.status === "ACTIVE" && field.isSearchable);
}

export function filterableFields(fields: LeadFieldDefinition[]): LeadFieldDefinition[] {
  return fields.filter((field) => field.status === "ACTIVE" && field.isFilterable);
}
