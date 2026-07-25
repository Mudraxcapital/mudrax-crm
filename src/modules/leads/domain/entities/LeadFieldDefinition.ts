// ============================================================================
// Master lead field definition (system + custom). Framework-free.
// ============================================================================

export const LEAD_FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "CURRENCY",
  "PHONE",
  "EMAIL",
  "DROPDOWN",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
  "DATE",
  "DATE_TIME",
  "BOOLEAN",
  "URL",
  "FILE",
] as const;

export type LeadFieldType = (typeof LEAD_FIELD_TYPES)[number];

export const LEAD_FIELD_GROUPS = ["PRIMARY", "SECONDARY", "HIDDEN"] as const;
export type LeadFieldGroup = (typeof LEAD_FIELD_GROUPS)[number];

export const LEAD_FIELD_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type LeadFieldStatus = (typeof LEAD_FIELD_STATUSES)[number];

/** System columns that map onto the Lead aggregate (never deleteable). */
export const PROTECTED_SYSTEM_KEYS = ["full_name", "phone"] as const;
export type ProtectedSystemKey = (typeof PROTECTED_SYSTEM_KEYS)[number];

export const SYSTEM_LEAD_COLUMNS = [
  "fullNameSnapshot",
  "phoneSnapshot",
  "emailSnapshot",
] as const;
export type SystemLeadColumn = (typeof SYSTEM_LEAD_COLUMNS)[number];

export interface LeadFieldValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface LeadFieldDefinition {
  id: string;
  organizationId: string;
  name: string;
  internalKey: string;
  fieldType: LeadFieldType;
  fieldGroup: LeadFieldGroup;
  status: LeadFieldStatus;
  isSystem: boolean;
  isRequired: boolean;
  isVisible: boolean;
  isSearchable: boolean;
  isFilterable: boolean;
  isImportable: boolean;
  isExportable: boolean;
  defaultValue: string | null;
  validationRules: LeadFieldValidationRules | null;
  selectOptions: string[] | null;
  displayOrder: number;
  systemColumn: SystemLeadColumn | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadFieldValue {
  fieldDefinitionId: string;
  internalKey: string;
  /** Normalized display/storage string (multi-select joined by `|`). */
  rawValue: string | null;
  valueText: string | null;
  valueNumber: number | null;
  valueDate: Date | null;
  valueDateTime: Date | null;
  valueBoolean: boolean | null;
  valueSelectOption: string | null;
  valueJson: unknown | null;
}

/** Normalize legacy Prisma enum `SINGLE_SELECT` → DROPDOWN. */
export function normalizeLeadFieldType(raw: string): LeadFieldType {
  if (raw === "SINGLE_SELECT") return "DROPDOWN";
  if ((LEAD_FIELD_TYPES as readonly string[]).includes(raw)) {
    return raw as LeadFieldType;
  }
  return "TEXT";
}

export function isProtectedSystemField(field: Pick<LeadFieldDefinition, "internalKey" | "isSystem">): boolean {
  return (
    field.isSystem &&
    (PROTECTED_SYSTEM_KEYS as readonly string[]).includes(field.internalKey)
  );
}

export function slugifyInternalKey(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return slug.length > 0 ? slug : `field_${Date.now()}`;
}
