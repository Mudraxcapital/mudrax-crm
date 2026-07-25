import type {
  CreateLeadFieldDefinitionData,
  LeadFieldDefinitionRepository,
  UpdateLeadFieldDefinitionData,
  UpsertLeadFieldValueData,
} from "../domain/repositories/LeadFieldDefinitionRepository";
import type { LeadFieldDefinition, LeadFieldValue } from "../domain/entities/LeadFieldDefinition";
import type { LeadAuditActor } from "../domain/entities/LeadAuditRecord";

let nextId = 1;
function makeId(): string {
  return `00000000-0000-0000-0009-${String(nextId++).padStart(12, "0")}`;
}

function systemDefaults(organizationId: string): LeadFieldDefinition[] {
  const now = new Date();
  return [
    {
      id: makeId(),
      organizationId,
      name: "Lead Name",
      internalKey: "full_name",
      fieldType: "TEXT",
      fieldGroup: "PRIMARY",
      status: "ACTIVE",
      isSystem: true,
      isRequired: true,
      isVisible: true,
      isSearchable: true,
      isFilterable: true,
      isImportable: true,
      isExportable: true,
      defaultValue: null,
      validationRules: { minLength: 2, maxLength: 200 },
      selectOptions: null,
      displayOrder: 10,
      systemColumn: "fullNameSnapshot",
      createdByUserId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: makeId(),
      organizationId,
      name: "Phone",
      internalKey: "phone",
      fieldType: "PHONE",
      fieldGroup: "PRIMARY",
      status: "ACTIVE",
      isSystem: true,
      isRequired: false,
      isVisible: true,
      isSearchable: true,
      isFilterable: true,
      isImportable: true,
      isExportable: true,
      defaultValue: null,
      validationRules: { maxLength: 20 },
      selectOptions: null,
      displayOrder: 20,
      systemColumn: "phoneSnapshot",
      createdByUserId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: makeId(),
      organizationId,
      name: "Email",
      internalKey: "email",
      fieldType: "EMAIL",
      fieldGroup: "PRIMARY",
      status: "ACTIVE",
      isSystem: true,
      isRequired: false,
      isVisible: true,
      isSearchable: true,
      isFilterable: true,
      isImportable: true,
      isExportable: true,
      defaultValue: null,
      validationRules: null,
      selectOptions: null,
      displayOrder: 30,
      systemColumn: "emailSnapshot",
      createdByUserId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export class FakeLeadFieldDefinitionRepository implements LeadFieldDefinitionRepository {
  fields = new Map<string, LeadFieldDefinition>();
  values = new Map<string, LeadFieldValue[]>();
  private seededOrgs = new Set<string>();

  async ensureSystemDefaults(organizationId: string): Promise<void> {
    if (this.seededOrgs.has(organizationId)) return;
    for (const field of systemDefaults(organizationId)) {
      this.fields.set(field.id, field);
    }
    this.seededOrgs.add(organizationId);
  }

  async findById(id: string) {
    return this.fields.get(id) ?? null;
  }

  async findByInternalKey(organizationId: string, internalKey: string) {
    await this.ensureSystemDefaults(organizationId);
    return (
      [...this.fields.values()].find(
        (field) => field.organizationId === organizationId && field.internalKey === internalKey,
      ) ?? null
    );
  }

  async list(organizationId: string) {
    await this.ensureSystemDefaults(organizationId);
    return [...this.fields.values()]
      .filter((field) => field.organizationId === organizationId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async listActive(organizationId: string) {
    return (await this.list(organizationId)).filter((field) => field.status === "ACTIVE");
  }

  async createWithAudit(data: CreateLeadFieldDefinitionData, _actor: LeadAuditActor) {
    void _actor;
    const now = new Date();
    const field: LeadFieldDefinition = {
      id: makeId(),
      organizationId: data.organizationId,
      name: data.name,
      internalKey: data.internalKey,
      fieldType: data.fieldType,
      fieldGroup: data.fieldGroup,
      status: data.status ?? "ACTIVE",
      isSystem: data.isSystem ?? false,
      isRequired: data.isRequired ?? false,
      isVisible: data.isVisible ?? true,
      isSearchable: data.isSearchable ?? false,
      isFilterable: data.isFilterable ?? false,
      isImportable: data.isImportable ?? true,
      isExportable: data.isExportable ?? true,
      defaultValue: data.defaultValue ?? null,
      validationRules: data.validationRules ?? null,
      selectOptions: data.selectOptions ?? null,
      displayOrder: data.displayOrder ?? 100,
      systemColumn: data.systemColumn ?? null,
      createdByUserId: data.createdByUserId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.fields.set(field.id, field);
    return field;
  }

  async updateWithAudit(id: string, data: UpdateLeadFieldDefinitionData) {
    const existing = this.fields.get(id);
    if (!existing) throw new Error("missing");
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.fields.set(id, updated);
    return updated;
  }

  async reorderWithAudit(organizationId: string, orderedIds: string[]) {
    for (let index = 0; index < orderedIds.length; index++) {
      const field = this.fields.get(orderedIds[index]!);
      if (field && field.organizationId === organizationId) {
        this.fields.set(field.id, { ...field, displayOrder: (index + 1) * 10 });
      }
    }
    return this.list(organizationId);
  }

  async listValuesForLead(leadId: string) {
    return this.values.get(leadId) ?? [];
  }

  async listValuesForLeads(leadIds: string[]) {
    const map = new Map<string, LeadFieldValue[]>();
    for (const id of leadIds) map.set(id, this.values.get(id) ?? []);
    return map;
  }

  async upsertValuesForLead(leadId: string, values: UpsertLeadFieldValueData[]) {
    const defs = [...this.fields.values()];
    const next: LeadFieldValue[] = [...(this.values.get(leadId) ?? [])];
    for (const value of values) {
      const def = defs.find((field) => field.id === value.fieldDefinitionId);
      const row: LeadFieldValue = {
        fieldDefinitionId: value.fieldDefinitionId,
        internalKey: def?.internalKey ?? value.fieldDefinitionId,
        rawValue: value.valueText ?? value.valueSelectOption ?? null,
        valueText: value.valueText ?? null,
        valueNumber: value.valueNumber ?? null,
        valueDate: value.valueDate ?? null,
        valueDateTime: value.valueDateTime ?? null,
        valueBoolean: value.valueBoolean ?? null,
        valueSelectOption: value.valueSelectOption ?? null,
        valueJson: value.valueJson ?? null,
      };
      const idx = next.findIndex((item) => item.fieldDefinitionId === value.fieldDefinitionId);
      if (idx >= 0) next[idx] = row;
      else next.push(row);
    }
    this.values.set(leadId, next);
  }
}
