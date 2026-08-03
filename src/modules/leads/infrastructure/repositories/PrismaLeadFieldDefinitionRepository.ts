// ============================================================================
// Prisma-backed Lead Field Definition repository + per-lead custom values.
// ============================================================================

import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  CreateLeadFieldDefinitionData,
  LeadFieldDefinitionRepository,
  UpdateLeadFieldDefinitionData,
  UpsertLeadFieldValueData,
} from "../../domain/repositories/LeadFieldDefinitionRepository";
import type { LeadFieldDefinition } from "../../domain/entities/LeadFieldDefinition";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import {
  LeadFieldNameConflictError,
  LeadFieldStaleEditError,
} from "../../domain/errors/LeadFieldErrors";
import { toLeadFieldDefinition, toLeadFieldValue, toPrismaFieldType } from "../mappers/leadFieldMapper";

const TARGET_TYPE = "LeadFieldDefinition";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

const SYSTEM_DEFAULTS: Array<{
  name: string;
  internalKey: string;
  dataType: string;
  fieldGroup: "PRIMARY" | "SECONDARY" | "HIDDEN";
  isRequired: boolean;
  isSearchable: boolean;
  isFilterable: boolean;
  isImportable: boolean;
  isExportable: boolean;
  displayOrder: number;
  systemColumn: string;
  validationRules?: Prisma.InputJsonValue;
}> = [
  {
    name: "Customer Name",
    internalKey: "full_name",
    dataType: "TEXT",
    fieldGroup: "PRIMARY",
    isRequired: true,
    isSearchable: true,
    isFilterable: true,
    isImportable: true,
    isExportable: true,
    displayOrder: 10,
    systemColumn: "fullNameSnapshot",
    validationRules: { minLength: 2, maxLength: 200 },
  },
  {
    name: "Phone",
    internalKey: "phone",
    dataType: "PHONE",
    fieldGroup: "PRIMARY",
    isRequired: false,
    isSearchable: true,
    isFilterable: true,
    isImportable: true,
    isExportable: true,
    displayOrder: 20,
    systemColumn: "phoneSnapshot",
    validationRules: { maxLength: 20 },
  },
  {
    name: "Email",
    internalKey: "email",
    dataType: "EMAIL",
    fieldGroup: "PRIMARY",
    isRequired: false,
    isSearchable: true,
    isFilterable: true,
    isImportable: true,
    isExportable: true,
    displayOrder: 30,
    systemColumn: "emailSnapshot",
  },
];

function toAuditJson(field: LeadFieldDefinition): Prisma.InputJsonValue {
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
    validationRules: field.validationRules as Prisma.InputJsonValue,
    selectOptions: field.selectOptions,
    displayOrder: field.displayOrder,
    systemColumn: field.systemColumn,
  };
}

export class PrismaLeadFieldDefinitionRepository implements LeadFieldDefinitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<LeadFieldDefinition | null> {
    const row = await this.prisma.customFieldDefinition.findUnique({ where: { id } });
    return row ? toLeadFieldDefinition(row) : null;
  }

  async findByInternalKey(
    organizationId: string,
    internalKey: string,
  ): Promise<LeadFieldDefinition | null> {
    const row = await this.prisma.customFieldDefinition.findUnique({
      where: { organizationId_internalKey: { organizationId, internalKey } },
    });
    return row ? toLeadFieldDefinition(row) : null;
  }

  async list(organizationId: string): Promise<LeadFieldDefinition[]> {
    await this.ensureSystemDefaults(organizationId);
    const rows = await this.prisma.customFieldDefinition.findMany({
      where: { organizationId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(toLeadFieldDefinition);
  }

  async listActive(organizationId: string): Promise<LeadFieldDefinition[]> {
    const all = await this.list(organizationId);
    return all.filter((field) => field.status === "ACTIVE");
  }

  async createWithAudit(
    data: CreateLeadFieldDefinitionData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadFieldDefinition> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.customFieldDefinition.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          internalKey: data.internalKey,
          dataType: toPrismaFieldType(data.fieldType),
          fieldGroup: data.fieldGroup,
          status: data.status ?? "ACTIVE",
          isActive: (data.status ?? "ACTIVE") === "ACTIVE",
          isSystem: data.isSystem ?? false,
          isRequired: data.isRequired ?? false,
          isVisible: data.isVisible ?? true,
          isSearchable: data.isSearchable ?? false,
          isFilterable: data.isFilterable ?? false,
          isImportable: data.isImportable ?? true,
          isExportable: data.isExportable ?? true,
          defaultValue: data.defaultValue ?? null,
          validationRules: (data.validationRules ?? undefined) as Prisma.InputJsonValue | undefined,
          selectOptions: data.selectOptions ?? undefined,
          displayOrder: data.displayOrder ?? 100,
          systemColumn: data.systemColumn ?? null,
          createdByUserId: data.createdByUserId ?? null,
        },
      });
      const field = toLeadFieldDefinition(row);
      await tx.leadAuditLog.create({
        data: {
          organizationId: data.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LeadFieldCreated",
          targetType: TARGET_TYPE,
          targetId: field.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(field),
          recordHash: PLACEHOLDER_RECORD_HASH,
          previousRecordHash: null,
        },
      });
      return field;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new LeadFieldNameConflictError(data.name);
      }
      throw error;
    }
  }

  async updateWithAudit(
    id: string,
    data: UpdateLeadFieldDefinitionData,
    actor: LeadAuditActor,
    action: string,
    correlationId?: string | null,
    options?: { expectedUpdatedAt?: Date },
  ): Promise<LeadFieldDefinition> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.customFieldDefinition.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Lead field ${id} not found`);
      }
      const before = toLeadFieldDefinition(existing);

      const updateData = {
        name: data.name,
        dataType: data.fieldType ? toPrismaFieldType(data.fieldType) : undefined,
        fieldGroup: data.fieldGroup,
        status: data.status,
        isActive: data.status ? data.status === "ACTIVE" : undefined,
        isRequired: data.isRequired,
        isVisible: data.isVisible,
        isSearchable: data.isSearchable,
        isFilterable: data.isFilterable,
        isImportable: data.isImportable,
        isExportable: data.isExportable,
        defaultValue: data.defaultValue,
        validationRules:
          data.validationRules === undefined
            ? undefined
            : data.validationRules === null
              ? Prisma.DbNull
              : (data.validationRules as Prisma.InputJsonValue),
        selectOptions:
          data.selectOptions === undefined
            ? undefined
            : data.selectOptions === null
              ? Prisma.DbNull
              : (data.selectOptions as Prisma.InputJsonValue),
        displayOrder: data.displayOrder,
      };

      if (options?.expectedUpdatedAt) {
        const { count } = await tx.customFieldDefinition.updateMany({
          where: { id, updatedAt: options.expectedUpdatedAt },
          data: updateData,
        });
        if (count === 0) {
          throw new LeadFieldStaleEditError();
        }
      } else {
        await tx.customFieldDefinition.update({
          where: { id },
          data: updateData,
        });
      }

      const row = await tx.customFieldDefinition.findUniqueOrThrow({ where: { id } });
      const after = toLeadFieldDefinition(row);
      await tx.leadAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action,
          targetType: TARGET_TYPE,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
          previousRecordHash: null,
        },
      });
      return after;
    });
  }

  async reorderWithAudit(
    organizationId: string,
    orderedIds: string[],
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadFieldDefinition[]> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRows = await tx.customFieldDefinition.findMany({
        where: { organizationId },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      });
      const before = beforeRows.map(toLeadFieldDefinition);

      for (let index = 0; index < orderedIds.length; index++) {
        const id = orderedIds[index]!;
        await tx.customFieldDefinition.updateMany({
          where: { id, organizationId },
          data: { displayOrder: (index + 1) * 10 },
        });
      }

      const afterRows = await tx.customFieldDefinition.findMany({
        where: { organizationId },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      });
      const after = afterRows.map(toLeadFieldDefinition);

      await tx.leadAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LeadFieldDisplayOrderChanged",
          targetType: TARGET_TYPE,
          targetId: orderedIds[0] ?? organizationId,
          correlationId: correlationId ?? null,
          beforeState: { order: before.map((field) => field.id) },
          afterState: { order: after.map((field) => field.id) },
          recordHash: PLACEHOLDER_RECORD_HASH,
          previousRecordHash: null,
        },
      });

      return after;
    });
  }

  async listValuesForLead(leadId: string) {
    const rows = await this.prisma.leadCustomFieldValue.findMany({
      where: { leadId },
      include: { customFieldDefinition: { select: { internalKey: true } } },
    });
    return rows.map(toLeadFieldValue);
  }

  async listValuesForLeads(leadIds: string[]) {
    if (leadIds.length === 0) return new Map();
    const rows = await this.prisma.leadCustomFieldValue.findMany({
      where: { leadId: { in: leadIds } },
      include: { customFieldDefinition: { select: { internalKey: true } } },
    });
    const map = new Map<string, ReturnType<typeof toLeadFieldValue>[]>();
    for (const row of rows) {
      const list = map.get(row.leadId) ?? [];
      list.push(toLeadFieldValue(row));
      map.set(row.leadId, list);
    }
    return map;
  }

  async upsertValuesForLead(leadId: string, values: UpsertLeadFieldValueData[]): Promise<void> {
    if (values.length === 0) return;
    await this.prisma.$transaction(
      values.map((value) =>
        this.prisma.leadCustomFieldValue.upsert({
          where: {
            leadId_customFieldDefinitionId: {
              leadId,
              customFieldDefinitionId: value.fieldDefinitionId,
            },
          },
          create: {
            leadId,
            customFieldDefinitionId: value.fieldDefinitionId,
            valueText: value.valueText ?? null,
            valueNumber: value.valueNumber ?? null,
            valueDate: value.valueDate ?? null,
            valueDateTime: value.valueDateTime ?? null,
            valueBoolean: value.valueBoolean ?? null,
            valueSelectOption: value.valueSelectOption ?? null,
            valueJson: (value.valueJson ?? undefined) as Prisma.InputJsonValue | undefined,
          },
          update: {
            valueText: value.valueText ?? null,
            valueNumber: value.valueNumber ?? null,
            valueDate: value.valueDate ?? null,
            valueDateTime: value.valueDateTime ?? null,
            valueBoolean: value.valueBoolean ?? null,
            valueSelectOption: value.valueSelectOption ?? null,
            valueJson:
              value.valueJson === undefined
                ? undefined
                : value.valueJson === null
                  ? Prisma.DbNull
                  : (value.valueJson as Prisma.InputJsonValue),
          },
        }),
      ),
    );
  }

  async createManyValues(
    rows: Array<{ leadId: string; values: UpsertLeadFieldValueData[] }>,
  ): Promise<void> {
    const data = rows.flatMap(({ leadId, values }) =>
      values.map((value) => ({
        leadId,
        customFieldDefinitionId: value.fieldDefinitionId,
        valueText: value.valueText ?? null,
        valueNumber: value.valueNumber ?? null,
        valueDate: value.valueDate ?? null,
        valueDateTime: value.valueDateTime ?? null,
        valueBoolean: value.valueBoolean ?? null,
        valueSelectOption: value.valueSelectOption ?? null,
        valueJson: (value.valueJson ?? undefined) as Prisma.InputJsonValue | undefined,
      })),
    );
    if (data.length === 0) return;
    const CHUNK = 500;
    for (let offset = 0; offset < data.length; offset += CHUNK) {
      await this.prisma.leadCustomFieldValue.createMany({
        data: data.slice(offset, offset + CHUNK),
        skipDuplicates: true,
      });
    }
  }

  async ensureSystemDefaults(
    organizationId: string,
    createdByUserId?: string | null,
  ): Promise<void> {
    for (const def of SYSTEM_DEFAULTS) {
      await this.prisma.customFieldDefinition.upsert({
        where: {
          organizationId_internalKey: {
            organizationId,
            internalKey: def.internalKey,
          },
        },
        update: {
          isSystem: true,
          systemColumn: def.systemColumn,
        },
        create: {
          organizationId,
          name: def.name,
          internalKey: def.internalKey,
          dataType: toPrismaFieldType(def.dataType),
          fieldGroup: def.fieldGroup,
          status: "ACTIVE",
          isActive: true,
          isSystem: true,
          isRequired: def.isRequired,
          isVisible: true,
          isSearchable: def.isSearchable,
          isFilterable: def.isFilterable,
          isImportable: def.isImportable,
          isExportable: def.isExportable,
          displayOrder: def.displayOrder,
          systemColumn: def.systemColumn,
          validationRules: def.validationRules,
          createdByUserId: createdByUserId ?? null,
        },
      });
    }

    // Rename legacy default label without overwriting admin-customized names.
    await this.prisma.customFieldDefinition.updateMany({
      where: {
        organizationId,
        internalKey: "full_name",
        name: "Lead Name",
      },
      data: { name: "Customer Name" },
    });
  }
}
