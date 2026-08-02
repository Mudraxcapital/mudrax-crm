import { describe, expect, it, vi } from "vitest";
import { makeCreateUser } from "../application/use-cases/createUser";
import type { UserRepository } from "../domain/repositories/UserRepository";
import type { RoleAssignmentPort } from "../application/ports/RoleAssignmentPort";
import type { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { AdminRoleProtectedError, DuplicateUserEmailError } from "../domain/errors/UserErrors";
import type { User } from "../domain/entities/User";

function user(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    employeeId: "MCS0010",
    fullName: "Test User",
    email: "test@mudraxcapital.com",
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
    updatedByUserId: "admin1",
    lastLoginAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("createUser", () => {
  it("rejects Manager creating an Admin", async () => {
    const createUser = makeCreateUser(
      { findByEmail: vi.fn().mockResolvedValue(null) } as unknown as UserRepository,
      {} as RoleAssignmentPort,
      { hash: vi.fn() } as unknown as PasswordHasher,
    );

    await expect(
      createUser({
        input: {
          fullName: "Boss",
          email: "boss@mudraxcapital.com",
          phone: "+919999900099",
          password: "Password1!",
          role: "Admin",
          status: "ACTIVE",
        },
        actorRoles: ["Manager"],
        hierarchy: {
          primaryRole: "Manager",
          ownerManagerId: "mgr1",
          teamLeadId: null,
          visibleUserIds: ["mgr1"],
          unrestricted: false,
        },
        actor: { actorType: "USER", actorId: "mgr1" },
      }),
    ).rejects.toBeInstanceOf(AdminRoleProtectedError);
  });

  it("creates a Caller with auto employee id and Team Lead", async () => {
    const created = user();
    const repository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByPhone: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(user({ id: "tl1", fullName: "Lead One" })),
      findSummaryById: vi.fn().mockResolvedValue({
        id: "tl1",
        organizationId: "org1",
        employeeId: "MCS0003",
        fullName: "Lead One",
        email: "lead@mudraxcapital.com",
        status: "ACTIVE",
        currentTeamId: null,
        currentBranchId: null,
      }),
      createWithAudit: vi.fn().mockResolvedValue(created),
    } as unknown as UserRepository;

    const roles = {
      getPrimaryRoleName: vi.fn().mockResolvedValue("Team Lead"),
      assignFixedRole: vi.fn().mockResolvedValue({ previousRole: null, nextRole: "Caller" }),
      getPermissionCodesForUser: vi.fn().mockResolvedValue(["lead.view"]),
    } as unknown as RoleAssignmentPort;

    const hasher = { hash: vi.fn().mockResolvedValue("hashed") } as unknown as PasswordHasher;
    const createUser = makeCreateUser(repository, roles, hasher);

    const result = await createUser({
      input: {
        fullName: "Test User",
        email: "test@mudraxcapital.com",
        phone: "+919999900010",
        password: "Password1!",
        role: "Caller",
        status: "ACTIVE",
        assignedTeamLeadId: "tl1",
      },
      actorRoles: ["Admin"],
      hierarchy: {
        primaryRole: "Admin",
        ownerManagerId: null,
        teamLeadId: null,
        visibleUserIds: null,
        unrestricted: true,
      },
      actor: { actorType: "USER", actorId: "admin1" },
    });

    expect(result.employeeId).toBe("MCS0010");
    expect(hasher.hash).toHaveBeenCalledWith("Password1!");
    expect(roles.assignFixedRole).toHaveBeenCalledWith("u1", "Caller", "admin1");
    expect(repository.createWithAudit).toHaveBeenCalledWith(
      expect.not.objectContaining({ organizationId: expect.anything() }),
      expect.anything(),
      undefined,
    );
  });

  it("allows Admin to create a Direct Admin Caller without a Team Lead", async () => {
    const created = user({ assignedTeamLeadId: null });
    const repository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByPhone: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      findSummaryById: vi.fn(),
      createWithAudit: vi.fn().mockResolvedValue(created),
    } as unknown as UserRepository;

    const roles = {
      getPrimaryRoleName: vi.fn(),
      assignFixedRole: vi.fn().mockResolvedValue({ previousRole: null, nextRole: "Caller" }),
    } as unknown as RoleAssignmentPort;

    const hasher = { hash: vi.fn().mockResolvedValue("hashed") } as unknown as PasswordHasher;
    const createUser = makeCreateUser(repository, roles, hasher);

    await createUser({
      input: {
        fullName: "Freelance Caller",
        email: "freelance@mudraxcapital.com",
        phone: "+919999900012",
        password: "Password1!",
        role: "Caller",
        status: "ACTIVE",
        assignedTeamLeadId: "",
      },
      actorRoles: ["Admin"],
      hierarchy: {
        primaryRole: "Admin",
        ownerManagerId: null,
        teamLeadId: null,
        visibleUserIds: null,
        unrestricted: true,
      },
      actor: { actorType: "USER", actorId: "admin1" },
    });

    expect(repository.createWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedTeamLeadId: null,
        reportingManagerId: null,
      }),
      expect.anything(),
      undefined,
    );
  });

  it("rejects Manager creating a Caller without a Team Lead", async () => {
    const createUser = makeCreateUser(
      {
        findByEmail: vi.fn().mockResolvedValue(null),
        findByPhone: vi.fn().mockResolvedValue(null),
      } as unknown as UserRepository,
      {} as RoleAssignmentPort,
      { hash: vi.fn() } as unknown as PasswordHasher,
    );

    await expect(
      createUser({
        input: {
          fullName: "Orphan Caller",
          email: "orphan@mudraxcapital.com",
          phone: "+919999900013",
          password: "Password1!",
          role: "Caller",
          status: "ACTIVE",
          assignedTeamLeadId: "",
        },
        actorRoles: ["Manager"],
        hierarchy: {
          primaryRole: "Manager",
          ownerManagerId: "mgr1",
          teamLeadId: null,
          visibleUserIds: ["mgr1", "tl1"],
          unrestricted: false,
        },
        actor: { actorType: "USER", actorId: "mgr1" },
      }),
    ).rejects.toThrow(/Team Lead|Direct Admin/);
  });

  it("rejects duplicate email", async () => {
    const createUser = makeCreateUser(
      { findByEmail: vi.fn().mockResolvedValue(user()) } as unknown as UserRepository,
      {} as RoleAssignmentPort,
      { hash: vi.fn() } as unknown as PasswordHasher,
    );

    await expect(
      createUser({
        input: {
          fullName: "Dup",
          email: "test@mudraxcapital.com",
          phone: "+919999900011",
          password: "Password1!",
          role: "Manager",
          status: "ACTIVE",
        },
        actorRoles: ["Admin"],
        hierarchy: {
          primaryRole: "Admin",
          ownerManagerId: null,
          teamLeadId: null,
          visibleUserIds: null,
          unrestricted: true,
        },
        actor: { actorType: "USER", actorId: "admin1" },
      }),
    ).rejects.toBeInstanceOf(DuplicateUserEmailError);
  });
});

describe("employeeId formatter", () => {
  it("formats MCS sequence", async () => {
    const { formatEmployeeId, nextEmployeeId } = await import("../domain/services/employeeId");
    expect(formatEmployeeId(1)).toBe("MCS0001");
    expect(nextEmployeeId("MCS0004")).toBe("MCS0005");
  });
});
