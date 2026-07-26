// ============================================================================
// Self-service profile update — any authenticated employee, own account only.
// Name + phone. Role / status / hierarchy are never mutable here.
// ============================================================================

import type { UserRepository } from "../../domain/repositories/UserRepository";
import {
  DuplicateUserPhoneError,
  UserNotFoundError,
} from "../../domain/errors/UserErrors";
import type { UpdateOwnProfileInput } from "../validators/userSchemas";
import { toUserDto, type UserDto } from "../dto/UserDto";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";

export function makeUpdateOwnProfile(
  repository: UserRepository,
  roles: RoleAssignmentPort,
) {
  return async function updateOwnProfile(input: {
    userId: string;
    data: UpdateOwnProfileInput;
  }): Promise<UserDto> {
    const existing = await repository.findById(input.userId);
    if (!existing) throw new UserNotFoundError(input.userId);

    const phone = input.data.phone.trim();
    if (phone !== existing.phone) {
      const clash = await repository.findByPhone(phone);
      if (clash && clash.id !== input.userId) throw new DuplicateUserPhoneError(phone);
    }

    const updated = await repository.updateWithAudit(
      input.userId,
      {
        fullName: input.data.fullName.trim(),
        phone,
        updatedByUserId: input.userId,
      },
      { actorType: "USER", actorId: input.userId },
      "Profile Updated (Self)",
    );

    const roleName = await roles.getPrimaryRoleName(input.userId);
    const leadName = updated.assignedTeamLeadId
      ? ((await repository.findSummaryById(updated.assignedTeamLeadId))?.fullName ?? null)
      : null;
    const managerName = updated.reportingManagerId
      ? ((await repository.findSummaryById(updated.reportingManagerId))?.fullName ?? null)
      : null;

    return toUserDto(updated, {
      roleName,
      assignedTeamLeadName: leadName,
      reportingManagerName: managerName,
    });
  };
}
