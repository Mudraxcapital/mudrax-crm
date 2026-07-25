// ============================================================================
// Repository for the master Lead Field Definition catalog + per-lead values.
// ============================================================================

import type {
  LeadFieldDefinition,
  LeadFieldGroup,
  LeadFieldStatus,
  LeadFieldType,
  LeadFieldValidationRules,
  LeadFieldValue,
  SystemLeadColumn,
} from "../entities/LeadFieldDefinition";
import type { LeadAuditActor } from "../entities/LeadAuditRecord";

export interface CreateLeadFieldDefinitionData {
  organizationId: string;
  name: string;
  internalKey: string;
  fieldType: LeadFieldType;
  fieldGroup: LeadFieldGroup;
  status?: LeadFieldStatus;
  isSystem?: boolean;
  isRequired?: boolean;
  isVisible?: boolean;
  isSearchable?: boolean;
  isFilterable?: boolean;
  isImportable?: boolean;
  isExportable?: boolean;
  defaultValue?: string | null;
  validationRules?: LeadFieldValidationRules | null;
  selectOptions?: string[] | null;
  displayOrder?: number;
  systemColumn?: SystemLeadColumn | null;
  createdByUserId?: string | null;
}

export interface UpdateLeadFieldDefinitionData {
  name?: string;
  fieldType?: LeadFieldType;
  fieldGroup?: LeadFieldGroup;
  status?: LeadFieldStatus;
  isRequired?: boolean;
  isVisible?: boolean;
  isSearchable?: boolean;
  isFilterable?: boolean;
  isImportable?: boolean;
  isExportable?: boolean;
  defaultValue?: string | null;
  validationRules?: LeadFieldValidationRules | null;
  selectOptions?: string[] | null;
  displayOrder?: number;
}

export interface UpsertLeadFieldValueData {
  fieldDefinitionId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueDate?: Date | null;
  valueDateTime?: Date | null;
  valueBoolean?: boolean | null;
  valueSelectOption?: string | null;
  valueJson?: unknown | null;
}

export interface LeadFieldDefinitionRepository {
  findById(id: string): Promise<LeadFieldDefinition | null>;
  findByInternalKey(
    organizationId: string,
    internalKey: string,
  ): Promise<LeadFieldDefinition | null>;
  list(organizationId: string): Promise<LeadFieldDefinition[]>;
  listActive(organizationId: string): Promise<LeadFieldDefinition[]>;

  createWithAudit(
    data: CreateLeadFieldDefinitionData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadFieldDefinition>;

  updateWithAudit(
    id: string,
    data: UpdateLeadFieldDefinitionData,
    actor: LeadAuditActor,
    action: string,
    correlationId?: string | null,
  ): Promise<LeadFieldDefinition>;

  reorderWithAudit(
    organizationId: string,
    orderedIds: string[],
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadFieldDefinition[]>;

  listValuesForLead(leadId: string): Promise<LeadFieldValue[]>;
  listValuesForLeads(leadIds: string[]): Promise<Map<string, LeadFieldValue[]>>;

  upsertValuesForLead(
    leadId: string,
    values: UpsertLeadFieldValueData[],
  ): Promise<void>;

  ensureSystemDefaults(
    organizationId: string,
    createdByUserId?: string | null,
  ): Promise<void>;
}
