// ============================================================================
// src/modules/leads/application/use-cases/savedViews.ts
// ============================================================================

import type { SavedViewRepository } from "../../domain/repositories/SavedViewRepository";
import { SavedViewNotFoundError } from "../../domain/errors/LeadErrors";
import { toSavedViewDto, type SavedViewDto } from "../dto/SavedViewDto";
import type { CreateSavedViewInput, UpdateSavedViewInput } from "../validators/productivitySchemas";

export function makeListSavedViews(repository: SavedViewRepository) {
  return async function listSavedViews(ownerUserId: string): Promise<SavedViewDto[]> {
    const views = await repository.listForUser(ownerUserId);
    return views.map(toSavedViewDto);
  };
}

export function makeCreateSavedView(repository: SavedViewRepository) {
  return async function createSavedView(command: {
    ownerUserId: string;
    input: CreateSavedViewInput;
  }): Promise<SavedViewDto> {
    const view = await repository.create({
      ownerUserId: command.ownerUserId,
      name: command.input.name,
      filterConfig: command.input.filterConfig ?? {},
      isShared: command.input.isShared ?? false,
    });
    return toSavedViewDto(view);
  };
}

export function makeUpdateSavedView(repository: SavedViewRepository) {
  return async function updateSavedView(command: {
    id: string;
    ownerUserId: string;
    input: UpdateSavedViewInput;
  }): Promise<SavedViewDto> {
    const existing = await repository.findById(command.id);
    if (!existing || existing.ownerUserId !== command.ownerUserId) {
      throw new SavedViewNotFoundError(command.id);
    }
    const view = await repository.update(command.id, {
      name: command.input.name,
      filterConfig: command.input.filterConfig,
      isShared: command.input.isShared,
    });
    return toSavedViewDto(view);
  };
}

export function makeDeleteSavedView(repository: SavedViewRepository) {
  return async function deleteSavedView(command: {
    id: string;
    ownerUserId: string;
  }): Promise<void> {
    const existing = await repository.findById(command.id);
    if (!existing || existing.ownerUserId !== command.ownerUserId) {
      throw new SavedViewNotFoundError(command.id);
    }
    await repository.delete(command.id);
  };
}
