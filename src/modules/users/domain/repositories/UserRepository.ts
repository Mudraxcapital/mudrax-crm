// ============================================================================
// src/modules/users/domain/repositories/UserRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaUserRepository.
// ============================================================================

import type { UserAuthProfile, UserScopeContext, UserSummary } from "../entities/UserAuthProfile";

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

  /** Non-sensitive lookup used by other modules' assignment/ownership pickers (e.g. CRM Lead Assignment). */
  findSummaryById(id: string): Promise<UserSummary | null>;

  /** Non-sensitive listing used to populate assignment/membership dropdowns (e.g. CRM Lead/Campaign assignment). */
  listSummariesByOrganization(organizationId: string): Promise<UserSummary[]>;
}
