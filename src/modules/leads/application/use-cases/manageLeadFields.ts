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
  LeadFieldStaleEditError,
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
        fieldGroup: input.fieldGroup,
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

    if (command.input.expectedUpdatedAt) {
      const expected = new Date(command.input.expectedUpdatedAt).getTime();
      if (
        Number.isNaN(expected) ||
        expected !== existing.updatedAt.getTime()
      ) {
        throw new LeadFieldStaleEditError();
      }
    }

    if (command.input.name) {
      const trimmed = command.input.name.trim();
      const siblings = await repository.list(command.organizationId);
      if (
        siblings.some(
          (field) =>
            field.id !== command.id &&
            field.name.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        throw new LeadFieldNameConflictError(trimmed);
      }
    }

    if (isProtectedSystemField(existing)) {
      if (command.input.fieldType && command.input.fieldType !== existing.fieldType) {
        throw new ProtectedLeadFieldError(existing.internalKey, "retyped");
      }
      if (command.input.isVisible === false) {
        throw new ProtectedLeadFieldError(existing.internalKey, "hidden");
      }
      if (command.input.fieldGroup && command.input.fieldGroup !== existing.fieldGroup) {
        throw new ProtectedLeadFieldError(existing.internalKey, "regrouped");
      }
      if (command.input.isRequired === false && existing.isRequired) {
        throw new ProtectedLeadFieldError(existing.internalKey, "made optional");
      }
    }

    const nextFieldType = command.input.fieldType ?? existing.fieldType;
    const nextSelectOptions =
      command.input.selectOptions !== undefined
        ? command.input.selectOptions
        : existing.selectOptions;
    const needsOptions =
      nextFieldType === "DROPDOWN" ||
      nextFieldType === "MULTI_SELECT" ||
      nextFieldType === "RADIO";
    if (needsOptions && (!nextSelectOptions || nextSelectOptions.length === 0)) {
      throw new Error(`${nextFieldType} fields require at least one option.`);
    }

    const validationChanged =
      command.input.validationRules !== undefined ||
      command.input.isRequired !== undefined ||
      command.input.selectOptions !== undefined;
    const action = validationChanged ? "LeadFieldValidationChanged" : "LeadFieldUpdated";

    // Visibility toggles must preserve fieldGroup (PRIMARY stays PRIMARY).
    // Do not auto-coerce isVisible=false into fieldGroup=HIDDEN.
    const updated = await repository.updateWithAudit(
      command.id,
      {
        ...command.input,
      },
      command.actor,
      action,
      undefined,
      command.input.expectedUpdatedAt
        ? { expectedUpdatedAt: new Date(command.input.expectedUpdatedAt) }
        : undefined,
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
    if (isProtectedSystemField(existing)) {
      throw new ProtectedLeadFieldError(existing.internalKey, "hidden");
    }
    // Preserve fieldGroup so Unhide restores PRIMARY/SECONDARY correctly.
    const updated = await repository.updateWithAudit(
      command.id,
      { isVisible: false },
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
        ...(existing.status !== "ACTIVE" ? { status: "ACTIVE" as const } : {}),
        // Only remap legacy rows that were previously forced into HIDDEN group.
        fieldGroup:
          existing.fieldGroup === "HIDDEN" ? "SECONDARY" : existing.fieldGroup,
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
