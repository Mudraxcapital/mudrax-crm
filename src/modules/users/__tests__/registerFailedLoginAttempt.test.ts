import { describe, expect, it, vi } from "vitest";
import { makeRegisterFailedLoginAttempt } from "../application/use-cases/registerFailedLoginAttempt";
import type { UserRepository } from "../domain/repositories/UserRepository";
import type { RoleAssignmentPort } from "../application/ports/RoleAssignmentPort";
import type { User } from "../domain/entities/User";

function activeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    employeeId: "MCS0010",
    fullName: "Test Caller",
    email: "caller@mudraxcapital.com",
    phone: "+919999900010",
    status: "ACTIVE",
    sessionVersion: 0,
    mustChangePassword: false,
    lockedUntil: null,
    lockedReason: null,
    profilePhotoUrl: null,
    assignedTeamLeadId: "tl1",
    reportingManagerId: null,
    canManageCallerAccounts: false,
    currentTeamId: null,
    currentBranchId: null,
    currentDepartmentId: null,
    createdByUserId: "admin1",
    updatedByUserId: null,
    lastLoginAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("registerFailedLoginAttempt", () => {
  it("suspends Caller after 5 consecutive failed passwords", async () => {
    const repository = {
      recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
      getPrimaryRoleName: undefined,
      findById: vi.fn().mockResolvedValue(activeUser()),
      countConsecutiveFailedPasswordAttempts: vi.fn().mockResolvedValue(5),
      suspendForLoginLockout: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;

    const roles = {
      getPrimaryRoleName: vi.fn().mockResolvedValue("Caller"),
    } as unknown as RoleAssignmentPort;

    const register = makeRegisterFailedLoginAttempt(repository, roles);
    const result = await register({
      userId: "u1",
      emailTried: "caller@mudraxcapital.com",
      ipAddress: "127.0.0.1",
      userAgent: "test",
    });

    expect(result.suspended).toBe(true);
    expect(repository.suspendForLoginLockout).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        reason: expect.stringContaining("5 failed login attempts"),
      }),
    );
  });

  it("does not suspend Admin accounts", async () => {
    const repository = {
      recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      countConsecutiveFailedPasswordAttempts: vi.fn(),
      suspendForLoginLockout: vi.fn(),
    } as unknown as UserRepository;

    const roles = {
      getPrimaryRoleName: vi.fn().mockResolvedValue("Admin"),
    } as unknown as RoleAssignmentPort;

    const register = makeRegisterFailedLoginAttempt(repository, roles);
    const result = await register({
      userId: "admin1",
      emailTried: "admin@mudraxcapital.com",
      ipAddress: null,
      userAgent: null,
    });

    expect(result.suspended).toBe(false);
    expect(repository.suspendForLoginLockout).not.toHaveBeenCalled();
    expect(repository.countConsecutiveFailedPasswordAttempts).not.toHaveBeenCalled();
  });

  it("does not suspend before the threshold", async () => {
    const repository = {
      recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(activeUser()),
      countConsecutiveFailedPasswordAttempts: vi.fn().mockResolvedValue(4),
      suspendForLoginLockout: vi.fn(),
    } as unknown as UserRepository;

    const roles = {
      getPrimaryRoleName: vi.fn().mockResolvedValue("Manager"),
    } as unknown as RoleAssignmentPort;

    const register = makeRegisterFailedLoginAttempt(repository, roles);
    const result = await register({
      userId: "u1",
      emailTried: "manager@mudraxcapital.com",
      ipAddress: null,
      userAgent: null,
    });

    expect(result.suspended).toBe(false);
    expect(repository.suspendForLoginLockout).not.toHaveBeenCalled();
  });
});
