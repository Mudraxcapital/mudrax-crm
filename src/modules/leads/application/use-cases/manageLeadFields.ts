// ============================================================================
// CRUD + lifecycle operations for the master Lead Field Definition catalog.
// ============================================================================

import type { LeadFieldDefinitionRepository } from "../../domain/repositories/LeadFieldDefinitionRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import {
  isProtectedSystemField,
  slugifyInternalKey,
} from "../../domain/entities/LeadFieldDefinition";
import {
  LeadFieldKeyConflictError,
  LeadFieldNameConflictError,
  LeadFieldNotFoundError,
  ProtectedLeadFieldError,
} from "../../domain/errors/LeadFieldErrors";
import type {
  CreateLeadFieldInput,
  ReorderLeadFieldsInput,
  UpdateLeadFieldInput,
} from "../validators/leadFieldSchemas";
import { toLeadFieldDefinitionDto, type LeadFieldDefinitionDto } from "../dto/LeadFieldDefinitionDto";

export function makeListLeadFields(repository: LeadFieldDefinitionRepository) {
  return async function listLeadFields(organizationId: string): Promise<LeadFieldDefinitionDto[]> {
    const fields = await repository.list(organizationId);
    return fields.map(toLeadFieldDefinitionDto);
  };
}

export function makeListActiveLeadFields(repository: LeadFieldDefinitionRepository) {
  return async function listActiveLeadFields(
    organizationId: string,
  ): Promise<LeadFieldDefinitionDto[]> {
    const fields = await repository.listActive(organizationId);
    return fields.map(toLeadFieldDefinitionDto);
  };
}

export function makeCreateLeadField(repository: LeadFieldDefinitionRepository) {
  return async function createLeadField(command: {
    organizationId: string;
    input: CreateLeadFieldInput;
    actor: LeadAuditActor;
  }): Promise<LeadFieldDefinitionDto> {
    const { organizationId, input, actor } = command;
    const internalKey = input.internalKey?.trim() || slugifyInternalKey(input.name);

    const [byKey, existing] = await Promise.all([
      repository.findByInternalKey(organizationId, internalKey),
      repository.list(organizationId),
    ]);
    if (byKey) throw new LeadFieldKeyConflictError(internalKey);
    if (existing.some((field) => field.name.toLowerCase() === input.name.trim().toLowerCase())) {
      throw new LeadFieldNameConflictError(input.name);
    }

    const needsOptions =
      input.fieldType === "DROPDOWN" ||
      input.fieldType === "MULTI_SELECT" ||
      input.fieldType === "RADIO";
    if (needsOptions && (!input.selectOptions || input.selectOptions.length === 0)) {
      throw new Error(`${input.fieldType} fields require at least one option.`);
    }

    const maxOrder = existing.reduce((max, field) => Math.max(max, field.displayOrder), 0);
    const created = await repository.createWithAudit(
      {
        organizationId,
        name: input.name.trim(),
        internalKey,
        fieldType: input.fieldType,
        fieldGroup: input.isVisible === false ? "HIDDEN" : input.fieldGroup,
        isRequired: input.isRequired,
        isVisible: input.isVisible,
        isSearchable: input.isSearchable,
        isFilterable: input.isFilterable,
        isImportable: input.isImportable,
        isExportable: input.isExportable,
        defaultValue: input.defaultValue ?? null,
        validationRules: input.validationRules ?? null,
        selectOptions: input.selectOptions ?? null,
        displayOrder: input.displayOrder ?? maxOrder + 10,
        createdByUserId: actor.actorType === "USER" ? actor.actorId : null,
      },
      actor,
    );

    return toLeadFieldDefinitionDto(created);
  };
}

export function makeUpdateLeadField(repository: LeadFieldDefinitionRepository) {
  return async function updateLeadField(command: {
    id: string;
    organizationId: string;
    input: UpdateLeadFieldInput;
    actor: LeadAuditActor;
  }): Promise<LeadFieldDefinitionDto> {
    const existing = await repository.findById(command.id);
    if (!existing || existing.organizationId !== command.organizationId) {
      throw new LeadFieldNotFoundError(command.id);
    }

    if (existing.isSystem && command.input.fieldType && command.input.fieldType !== existing.fieldType) {
      throw new ProtectedLeadFieldError(existing.internalKey, "retyped");
    }

    const validationChanged =
      command.input.validationRules !== undefined ||
      command.input.isRequired !== undefined ||
      command.input.selectOptions !== undefined;
    const action = validationChanged ? "LeadFieldValidationChanged" : "LeadFieldUpdated";

    const updated = await repository.updateWithAudit(
      command.id,
      {
        ...command.input,
        fieldGroup:
          command.input.isVisible === false
            ? "HIDDEN"
            : command.input.fieldGroup ?? existing.fieldGroup,
      },
      command.actor,
      action,
    );
    return toLeadFieldDefinitionDto(updated);
  };
}

export function makeHideLeadField(repository: LeadFieldDefinitionRepository) {
  return async function hideLeadField(command: {
    id: string;
    organizationId: string;
    actor: LeadAuditActor;
  }): Promise<LeadFieldDefinitionDto> {
    const existing = await repository.findById(command.id);
    if (!existing || existing.organizationId !== command.organizationId) {
      throw new LeadFieldNotFoundError(command.id);
    }
    const updated = await repository.updateWithAudit(
      command.id,
      { isVisible: false, fieldGroup: "HIDDEN" },
      command.actor,
      "LeadFieldHidden",
    );
    return toLeadFieldDefinitionDto(updated);
  };
}

export function makeShowLeadField(repository: LeadFieldDefinitionRepository) {
  return async function showLeadField(command: {
    id: string;
    organizationId: string;
    actor: LeadAuditActor;
  }): Promise<LeadFieldDefinitionDto> {
    const existing = await repository.findById(command.id);
    if (!existing || existing.organizationId !== command.organizationId) {
      throw new LeadFieldNotFoundError(command.id);
    }
    const updated = await repository.updateWithAudit(
      command.id,
      {
        isVisible: true,
        fieldGroup: existing.fieldGroup === "HIDDEN" ? "SECONDARY" : existing.fieldGroup,
      },
      command.actor,
      "LeadFieldShown",
    );
    return toLeadFieldDefinitionDto(updated);
  };
}

export function makeArchiveLeadField(repository: LeadFieldDefinitionRepository) {
  return async function archiveLeadField(command: {
    id: string;
    organizationId: string;
    actor: LeadAuditActor;
  }): Promise<LeadFieldDefinitionDto> {
    const existing = await repository.findById(command.id);
    if (!existing || existing.organizationId !== command.organizationId) {
      throw new LeadFieldNotFoundError(command.id);
    }
    if (isProtectedSystemField(existing)) {
      throw new ProtectedLeadFieldError(existing.internalKey, "archived or deleted");
    }
    const updated = await repository.updateWithAudit(
      command.id,
      { status: "ARCHIVED", isVisible: false },
      command.actor,
      "LeadFieldArchived",
    );
    return toLeadFieldDefinitionDto(updated);
  };
}

export function makeRestoreLeadField(repository: LeadFieldDefinitionRepository) {
  return async function restoreLeadField(command: {
    id: string;
    organizationId: string;
    actor: LeadAuditActor;
  }): Promise<LeadFieldDefinitionDto> {
    const existing = await repository.findById(command.id);
    if (!existing || existing.organizationId !== command.organizationId) {
      throw new LeadFieldNotFoundError(command.id);
    }
    const updated = await repository.updateWithAudit(
      command.id,
      { status: "ACTIVE", isVisible: true },
      command.actor,
      "LeadFieldRestored",
    );
    return toLeadFieldDefinitionDto(updated);
  };
}

export function makeReorderLeadFields(repository: LeadFieldDefinitionRepository) {
  return async function reorderLeadFields(command: {
    organizationId: string;
    input: ReorderLeadFieldsInput;
    actor: LeadAuditActor;
  }): Promise<LeadFieldDefinitionDto[]> {
    const fields = await repository.reorderWithAudit(
      command.organizationId,
      command.input.orderedIds,
      command.actor,
    );
    return fields.map(toLeadFieldDefinitionDto);
  };
}
