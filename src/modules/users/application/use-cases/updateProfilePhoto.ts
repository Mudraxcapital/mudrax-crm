// ============================================================================
// Profile photo upload / remove via DocumentStoragePort (local disk today).
// ============================================================================

import type { DocumentStoragePort } from "@/modules/documents/application/ports/DocumentStoragePort";
import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import { InvalidUserHierarchyError, UserNotFoundError } from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import { assertCanActOnHierarchyTarget } from "../services/userHierarchyPolicy";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

export function makeUpdateProfilePhoto(
  repository: UserRepository,
  roles: RoleAssignmentPort,
  storage: DocumentStoragePort,
) {
  return async function updateProfilePhoto(input: {
    userId: string;
    file: { bytes: Buffer; contentType: string; fileName: string } | null;
    remove?: boolean;
    actorRoles: string[];
    hierarchy: HierarchyScope;
    actor: UserAuditActor;
    ipAddress?: string | null;
  }): Promise<string | null> {
    const user = await repository.findById(input.userId);
    if (!user) throw new UserNotFoundError(input.userId);

    const targetRole = await roles.getPrimaryRoleName(input.userId);
    assertCanActOnHierarchyTarget({
      hierarchy: input.hierarchy,
      actorRoles: input.actorRoles,
      actorUserId: input.actor.actorId ?? "",
      targetUserId: input.userId,
      targetRole,
      action: "edit",
    });

    if (input.remove || !input.file) {
      await repository.updateWithAudit(
        input.userId,
        { profilePhotoUrl: null, updatedByUserId: input.actor.actorId },
        input.actor,
        "Profile Photo Removed",
      );
      return null;
    }

    if (!ALLOWED_TYPES.has(input.file.contentType)) {
      throw new InvalidUserHierarchyError("Profile photo must be JPEG, PNG, or WebP.");
    }
    if (input.file.bytes.byteLength > MAX_BYTES) {
      throw new InvalidUserHierarchyError("Profile photo must be 2 MB or smaller.");
    }

    const ext =
      input.file.contentType === "image/png"
        ? "png"
        : input.file.contentType === "image/webp"
          ? "webp"
          : "jpg";
    const relativeKey = `profile-photos/${input.userId}-${Date.now()}.${ext}`;
    const stored = await storage.store({
      organizationId: "mudrax",
      relativeKey,
      content: input.file.bytes,
      mimeType: input.file.contentType,
    });

    // Served via authenticated API route — store storage key, not a public URL.
    const photoRef = `storage:${stored.storageKey}`;
    await repository.updateWithAudit(
      input.userId,
      { profilePhotoUrl: photoRef, updatedByUserId: input.actor.actorId },
      input.actor,
      "Profile Photo Updated",
    );
    return photoRef;
  };
}
