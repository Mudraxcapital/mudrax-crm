"use server";

// ============================================================================
// src/modules/leads/presentation/controllers/productivity.actions.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  bulkAssignLeads,
  bulkAssignLeadsSchema,
  bulkChangeLeadStage,
  bulkChangeLeadStageSchema,
  bulkCloseLeads,
  bulkCloseLeadsSchema,
  createSavedView,
  createSavedViewSchema,
  deleteSavedView,
  importLeadsCsv,
  importLeadsCsvSchema,
  mergeLeads,
  mergeLeadsSchema,
  SavedViewNotFoundError,
  LeadMergeError,
  LeadNotFoundError,
  BulkOperationError,
} from "@/modules/leads";
import { requirePermission } from "@/infra/auth/session";

export type ProductivityFormState = { error?: string; success?: string };

export async function createSavedViewAction(
  _prev: ProductivityFormState | undefined,
  formData: FormData,
): Promise<ProductivityFormState> {
  const { session } = await requirePermission("saved_view.manage");
  const optional = (value: FormDataEntryValue | null) => {
    const text = typeof value === "string" ? value.trim() : "";
    return text.length > 0 ? text : undefined;
  };
  const parsed = createSavedViewSchema.safeParse({
    name: formData.get("name"),
    isShared: formData.get("isShared") === "true",
    filterConfig: {
      search: optional(formData.get("search")),
      currentStageId: optional(formData.get("currentStageId")),
      leadSourceId: optional(formData.get("leadSourceId")),
      assignedToUserId: optional(formData.get("assignedToUserId")),
    },
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await createSavedView({ ownerUserId: session.user.id, input: parsed.data });
  revalidatePath("/leads");
  return { success: "Saved filter created." };
}

export async function deleteSavedViewAction(id: string): Promise<void> {
  const { session } = await requirePermission("saved_view.manage");
  try {
    await deleteSavedView({ id, ownerUserId: session.user.id });
  } catch (error) {
    if (error instanceof SavedViewNotFoundError) {
      return;
    }
    throw error;
  }
  revalidatePath("/leads");
}

export async function importLeadsCsvAction(
  _prev: ProductivityFormState | undefined,
  formData: FormData,
): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.import");
  const parsed = importLeadsCsvSchema.safeParse({
    leadSourceId: formData.get("leadSourceId"),
    campaignId: formData.get("campaignId") || undefined,
    sourceFileName: formData.get("sourceFileName") || "leads.csv",
    csvText: formData.get("csvText"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const batch = await importLeadsCsv({
    organizationId: authContext.organizationId,
    input: parsed.data,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/leads");
  revalidatePath("/leads/import");
  return {
    success: `Imported ${batch.createdRowCount} Lead(s); ${batch.duplicateRowCount} duplicate match(es).`,
  };
}

export async function bulkAssignLeadsAction(
  _prev: ProductivityFormState | undefined,
  formData: FormData,
): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.reassign");
  const leadIds = formData.getAll("leadIds").map(String).filter(Boolean);
  const parsed = bulkAssignLeadsSchema.safeParse({
    leadIds,
    assignedToUserId: formData.get("assignedToUserId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const result = await bulkAssignLeads({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/leads");
    revalidatePath("/leads/pipeline");
    return {
      success: `Assigned ${result.succeeded.length} Lead(s); ${result.failed.length} failed.`,
    };
  } catch (error) {
    if (error instanceof BulkOperationError) return { error: error.message };
    throw error;
  }
}

export async function bulkChangeLeadStageAction(
  _prev: ProductivityFormState | undefined,
  formData: FormData,
): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.update");
  const leadIds = formData.getAll("leadIds").map(String).filter(Boolean);
  const parsed = bulkChangeLeadStageSchema.safeParse({
    leadIds,
    stageId: formData.get("stageId"),
    lostReasonId: formData.get("lostReasonId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const result = await bulkChangeLeadStage({
    organizationId: authContext.organizationId,
    input: parsed.data,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/leads");
  revalidatePath("/leads/pipeline");
  return {
    success: `Updated ${result.succeeded.length} Lead(s); ${result.failed.length} failed.`,
  };
}

export async function bulkCloseLeadsAction(
  _prev: ProductivityFormState | undefined,
  formData: FormData,
): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.update");
  const leadIds = formData.getAll("leadIds").map(String).filter(Boolean);
  const parsed = bulkCloseLeadsSchema.safeParse({
    leadIds,
    lostReasonId: formData.get("lostReasonId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const result = await bulkCloseLeads({
    organizationId: authContext.organizationId,
    input: parsed.data,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/leads");
  revalidatePath("/leads/pipeline");
  return {
    success: `Closed ${result.succeeded.length} Lead(s); ${result.failed.length} failed.`,
  };
}

export async function mergeLeadsAction(
  _prev: ProductivityFormState | undefined,
  formData: FormData,
): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.update");
  const parsed = mergeLeadsSchema.safeParse({
    survivingLeadId: formData.get("survivingLeadId"),
    mergedAwayLeadId: formData.get("mergedAwayLeadId"),
    lostReasonId: formData.get("lostReasonId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    await mergeLeads({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof LeadMergeError ||
      error instanceof LeadNotFoundError ||
      error instanceof SavedViewNotFoundError
    ) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${parsed.data.survivingLeadId}`);
  return { success: "Leads merged." };
}

export async function changeLeadStageKanbanAction(input: {
  leadId: string;
  stageId: string;
  lostReasonId?: string;
}): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.update");
  const result = await bulkChangeLeadStage({
    organizationId: authContext.organizationId,
    input: {
      leadIds: [input.leadId],
      stageId: input.stageId,
      lostReasonId: input.lostReasonId,
    },
    actor: { actorType: "USER", actorId: session.user.id },
  });
  if (result.failed[0]) return { error: result.failed[0].error };
  revalidatePath("/leads/pipeline");
  revalidatePath(`/leads/${input.leadId}`);
  return { success: "Stage updated." };
}
