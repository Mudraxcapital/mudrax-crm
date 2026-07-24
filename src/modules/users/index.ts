// Public API of the `users` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaUserRepository } from "./infrastructure/repositories/PrismaUserRepository";
import { makeUserAuthUseCases } from "./application/use-cases/authLookups";

export type {
  UserAuthProfile,
  UserScopeContext,
  UserStatus,
} from "./domain/entities/UserAuthProfile";
export type { RecordLoginAttemptInput } from "./domain/repositories/UserRepository";

const userAuthUseCases = makeUserAuthUseCases(new PrismaUserRepository(prisma));

export const getUserAuthProfileByEmail = userAuthUseCases.getUserAuthProfileByEmail;
export const getUserScopeContext = userAuthUseCases.getUserScopeContext;
export const countRecentFailedLoginAttempts = userAuthUseCases.countRecentFailedLoginAttempts;
export const recordLoginAttempt = userAuthUseCases.recordLoginAttempt;
export const touchLastLogin = userAuthUseCases.touchLastLogin;
