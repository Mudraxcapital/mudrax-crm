// ============================================================================
// src/modules/users/domain/repositories/UserRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaUserRepository.
// ============================================================================

import type { UserAuthProfile, UserScopeContext } from "../entities/UserAuthProfile";

export interface RecordLoginAttemptInput {
  userId: string | null;
  emailTried: string;
  succeeded: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
}

export interface UserRepository {
  findAuthProfileByEmail(email: string): Promise<UserAuthProfile | null>;
  findScopeContext(userId: string): Promise<UserScopeContext | null>;
  countRecentFailedLoginAttempts(email: string, sinceMinutesAgo: number): Promise<number>;
  recordLoginAttempt(input: RecordLoginAttemptInput): Promise<void>;
  touchLastLogin(userId: string): Promise<void>;
}
