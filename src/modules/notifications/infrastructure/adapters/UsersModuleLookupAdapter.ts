import { getUserSummary } from "@/modules/users";
import type { UserLookupPort, UserLookupSummary } from "../../application/ports/UserLookupPort";

export class UsersModuleLookupAdapter implements UserLookupPort {
  async findById(userId: string): Promise<UserLookupSummary | null> {
    const user = await getUserSummary(userId);
    if (!user) return null;
    return {
      id: user.id,
      organizationId: user.organizationId,
      status: user.status,
      fullName: user.fullName,
      email: user.email,
    };
  }
}
