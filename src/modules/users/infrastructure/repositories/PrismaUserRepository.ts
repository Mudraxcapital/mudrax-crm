// ============================================================================
// src/modules/users/infrastructure/repositories/PrismaUserRepository.ts
//
// Prisma-backed implementation of UserRepository. The only repository
// implementation allowed to know about `@prisma/client` in this module.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import type {
  RecordLoginAttemptInput,
  UserRepository,
} from "../../domain/repositories/UserRepository";
import type { UserAuthProfile, UserScopeContext } from "../../domain/entities/UserAuthProfile";
import { toUserAuthProfile, toUserScopeContext } from "../mappers/userMapper";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAuthProfileByEmail(email: string): Promise<UserAuthProfile | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return row ? toUserAuthProfile(row) : null;
  }

  async findScopeContext(userId: string): Promise<UserScopeContext | null> {
    const row = await this.prisma.user.findUnique({ where: { id: userId } });
    return row ? toUserScopeContext(row) : null;
  }

  async countRecentFailedLoginAttempts(email: string, sinceMinutesAgo: number): Promise<number> {
    return this.prisma.loginAttempt.count({
      where: {
        emailTried: email.toLowerCase(),
        succeeded: false,
        occurredAt: { gte: new Date(Date.now() - sinceMinutesAgo * 60_000) },
      },
    });
  }

  async recordLoginAttempt(input: RecordLoginAttemptInput): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        userId: input.userId,
        emailTried: input.emailTried.toLowerCase(),
        succeeded: input.succeeded,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: input.failureReason,
      },
    });
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
