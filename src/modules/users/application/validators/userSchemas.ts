// ============================================================================
// src/modules/users/application/validators/userSchemas.ts
// ============================================================================

import { z } from "zod";
import {
  PASSWORD_POLICY,
  PASSWORD_POLICY_HINT,
  validatePasswordPolicy,
} from "@/modules/auth/domain/policies/passwordPolicy";
import { FIXED_USER_ROLES, USER_STATUSES } from "../../domain/entities/User";

const roleSchema = z.enum(FIXED_USER_ROLES);
const statusSchema = z.enum(USER_STATUSES);

const passwordField = z
  .string()
  .min(PASSWORD_POLICY.minLength, PASSWORD_POLICY_HINT)
  .max(PASSWORD_POLICY.maxLength)
  .superRefine((value, ctx) => {
    const error = validatePasswordPolicy(value);
    if (error) {
      ctx.addIssue({ code: "custom", message: error });
    }
  });

export const createUserSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required.").max(200),
    email: z.string().trim().email("Valid email is required.").max(320),
    phone: z.string().trim().min(1, "Phone is required.").max(20),
    password: passwordField,
    role: roleSchema,
    status: statusSchema.default("ACTIVE"),
    profilePhotoUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
    assignedTeamLeadId: z.string().uuid().optional().or(z.literal("")),
    reportingManagerId: z.string().uuid().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.role === "Caller" && !value.assignedTeamLeadId) {
      ctx.addIssue({
        code: "custom",
        path: ["assignedTeamLeadId"],
        message: "Assigned Team Lead is required for Callers.",
      });
    }
    // Team Lead → Manager is enforced in normalizeHierarchyOnCreate (Managers
    // auto-bind to self; Admins must supply reportingManagerId).
  });

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(320).optional(),
    phone: z.string().trim().min(1).max(20).optional(),
    role: roleSchema.optional(),
    status: statusSchema.optional(),
    profilePhotoUrl: z.string().trim().url().max(500).nullable().optional().or(z.literal("")),
    assignedTeamLeadId: z.string().uuid().nullable().optional().or(z.literal("")),
    reportingManagerId: z.string().uuid().nullable().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.role === "Caller" && value.assignedTeamLeadId === "") {
      ctx.addIssue({
        code: "custom",
        path: ["assignedTeamLeadId"],
        message: "Assigned Team Lead is required for Callers.",
      });
    }
  });

export const resetPasswordSchema = z.object({
  password: passwordField,
});

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "New password and confirmation do not match.",
      });
    }
    if (value.currentPassword && value.currentPassword === value.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password cannot be the same as the current password.",
      });
    }
  });

export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;

export const bulkUserIdsSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "Select at least one user."),
});

export const listUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  teamLeadId: z.string().uuid().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type BulkUserIdsInput = z.infer<typeof bulkUserIdsSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
