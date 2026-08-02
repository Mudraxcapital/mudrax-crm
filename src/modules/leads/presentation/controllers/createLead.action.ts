"use server";

// ============================================================================
// src/modules/leads/presentation/controllers/createLead.action.ts
//
// Server Action backing the Lead creation form. Requires `lead.create`.
// Single Lead addition resolves/creates the Customer from Name + Phone.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { isCallerWorkspaceUser, resolveOwnerManagerId } from "@/modules/rbac";
import { getUser } from "@/modules/users";
import {
  createCustomer,
  DuplicateCustomerIdentifierError,
  findCustomerByContact,
} from "@/modules/customers";
import {
  createLead,
  createLeadSchema,
  InvalidAssigneeReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadSourceReferenceError,
  InvalidLeadStageReferenceError,
  LeadFieldValidationError,
  listActiveLeadFields,
} from "@/modules/leads";
import {
  assertCanAssignToUser,
  AssigneeNotAllowedError,
} from "@/shared/auth/assertCanAssignToUser";
import { ensurePersonalCampaign } from "@/modules/campaigns";
import { listUsersByRole } from "@/modules/users";
import { extractFieldValuesFromFormData } from "../lib/extractFieldValuesFromFormData";

export interface LeadFormState {
  error?: string;
}

export type CreateLeadFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

function asTrimmedString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

/** Prefer E.164-ish values; assume India (+91) for bare 10-digit mobiles. */
function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[\s()-]/g, "");
  if (/^\+?[0-9]{7,15}$/.test(digits)) {
    if (digits.startsWith("+")) return digits;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
    return digits.startsWith("+") ? digits : `+${digits}`;
  }
  return trimmed;
}

async function resolveCustomerForSingleLead(input: {
  organizationId: string;
  actorUserId: string;
  ownerManagerId: string | null;
  fullName: string;
  phone: string;
  email: string;
}): Promise<{ id: string } | { error: string }> {
  const phone = input.phone || null;
  const email = input.email || null;

  if (!input.fullName || input.fullName.length < 2) {
    return { error: "Name must be at least 2 characters." };
  }
  if (!phone && !email) {
    return { error: "Phone or email is required to create a lead." };
  }

  const existing = await findCustomerByContact(input.organizationId, { phone, email });
  if (existing) {
    return { id: existing.id };
  }

  const identifiers: Array<{ type: "PHONE" | "EMAIL"; value: string }> = [];
  if (phone) identifiers.push({ type: "PHONE", value: phone });
  if (email) identifiers.push({ type: "EMAIL", value: email });

  try {
    const created = await createCustomer({
      organizationId: input.organizationId,
      input: {
        fullName: input.fullName,
        identifiers,
      },
      actor: { actorType: "USER", actorId: input.actorUserId },
      ownerManagerId: input.ownerManagerId,
    });
    return { id: created.id };
  } catch (error) {
    if (error instanceof DuplicateCustomerIdentifierError) {
      return { id: error.existingCustomerId };
    }
    throw error;
  }
}

export async function createLeadAction(
  _previousState: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  const { session, authContext } = await requirePermission("lead.create");

  const fieldValues = extractFieldValuesFromFormData(formData);
  const activeFields = await listActiveLeadFields(authContext.organizationId);
  for (const field of activeFields) {
    if (
      (field.fieldType === "BOOLEAN" || field.fieldType === "CHECKBOX") &&
      fieldValues[field.internalKey] === undefined
    ) {
      fieldValues[field.internalKey] = "false";
    }
  }

  const fullName = asTrimmedString(fieldValues.full_name);
  const phone = normalizePhone(asTrimmedString(fieldValues.phone));
  const email = asTrimmedString(fieldValues.email);
  if (phone) fieldValues.phone = phone;
  const ownerManagerId = resolveOwnerManagerId(authContext);

  let customerId = String(formData.get("customerId") ?? "").trim();
  if (!customerId) {
    const resolved = await resolveCustomerForSingleLead({
      organizationId: authContext.organizationId,
      actorUserId: session.user.id,
      ownerManagerId,
      fullName,
      phone,
      email,
    });
    if ("error" in resolved) {
      return { error: resolved.error };
    }
    customerId = resolved.id;
  }

  const callerWorkspace = isCallerWorkspaceUser(authContext);
  const parsed = createLeadSchema.safeParse({
    customerId,
    leadSourceId: formData.get("leadSourceId"),
    // Callers may only assign leads to themselves.
    currentAssigneeUserId: callerWorkspace
      ? session.user.id
      : formData.get("currentAssigneeUserId") || undefined,
    fieldValues,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let resolvedOwnerManagerId = ownerManagerId;
  let ownerTeamLeadId = authContext.hierarchy.teamLeadId;
  if (parsed.data.currentAssigneeUserId) {
    try {
      assertCanAssignToUser(authContext, parsed.data.currentAssigneeUserId, {
        permissionCode: "lead.create",
        actorUserId: session.user.id,
      });
    } catch (error) {
      if (error instanceof AssigneeNotAllowedError) {
        return { error: error.message };
      }
      throw error;
    }
    try {
      const assignee = await getUser(parsed.data.currentAssigneeUserId);
      if (assignee.roleName === "Caller" && !assignee.assignedTeamLeadId) {
        // Direct Admin Caller — Admin-scoped book only.
        resolvedOwnerManagerId = null;
        ownerTeamLeadId = null;
      } else if (assignee.roleName === "Team Lead") {
        ownerTeamLeadId = assignee.id;
      } else if (assignee.assignedTeamLeadId) {
        ownerTeamLeadId = assignee.assignedTeamLeadId;
      }
    } catch {
      // Keep hierarchy teamLeadId fallback for getUser failures.
    }
  }

  // Single-add leads belong to the org's Personal Campaign so Caller/app
  // queues can scope them. Soft-fail if ownership/campaign setup is unavailable.
  let personalCampaignId: string | null = null;
  try {
    let campaignOwnerManagerId = resolvedOwnerManagerId;
    if (!campaignOwnerManagerId) {
      const managers = await listUsersByRole("Manager");
      campaignOwnerManagerId = managers[0]?.id ?? null;
    }
    if (campaignOwnerManagerId) {
      const memberUserIds = [
        parsed.data.currentAssigneeUserId,
        session.user.id,
      ].filter((id): id is string => Boolean(id));
      const personal = await ensurePersonalCampaign({
        organizationId: authContext.organizationId,
        ownerManagerId: campaignOwnerManagerId,
        actor: { actorType: "USER", actorId: session.user.id },
        memberUserIds,
      });
      personalCampaignId = personal.id;
    }
  } catch (error) {
    console.error("[createLeadAction] ensurePersonalCampaign failed", error);
  }

  let leadId: string;
  try {
    const lead = await createLead({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
      ownerManagerId: resolvedOwnerManagerId,
      ownerTeamLeadId,
      campaignId: personalCampaignId,
    });
    leadId = lead.id;
  } catch (error) {
    if (
      error instanceof InvalidCustomerReferenceError ||
      error instanceof InvalidLeadSourceReferenceError ||
      error instanceof InvalidLeadStageReferenceError ||
      error instanceof InvalidAssigneeReferenceError ||
      error instanceof LeadFieldValidationError ||
      error instanceof AssigneeNotAllowedError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/leads");
  if (personalCampaignId) {
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${personalCampaignId}`);
    revalidatePath("/caller/campaigns");
  }
  redirect(`/leads/${leadId}`);
}
