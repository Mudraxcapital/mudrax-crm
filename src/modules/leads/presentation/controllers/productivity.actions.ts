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
  previewImportDuplicates,
  previewImportDuplicatesSchema,
  buildDuplicateReportCsv,
  mergeLeads,
  mergeLeadsSchema,
  SavedViewNotFoundError,
  LeadMergeError,
  LeadNotFoundError,
  BulkOperationError,
  type DuplicateDetectionSummary,
} from "@/modules/leads";
import { requirePermission } from "@/infra/auth/session";

export type ProductivityFormState = {
  error?: string;
  success?: string;
  summary?: {
    created: number;
    duplicates: number;
    invalid: number;
    updated: number;
    failed: number;
    total: number;
    campaignId: string | null;
    assignedAgentIds: string[];
    distributionStrategy: string | null;
    auditNotes: string[];
    sampleErrors: Array<{ rowNumber: number; message: string }>;
  };
};

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
  try {
    const batch = await importLeadsCsv({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/leads");
    revalidatePath("/leads/import");
    return {
      success: `Imported ${batch.createdRowCount} Lead(s); ${batch.duplicateRowCount} duplicate match(es).`,
      summary: {
        created: batch.createdRowCount,
        duplicates: batch.skippedDuplicateCount,
        invalid: batch.skippedInvalidCount,
        updated: batch.updatedCount,
        failed: batch.failedCount,
        total: batch.totalRowCount,
        campaignId: batch.campaignId,
        assignedAgentIds: batch.assignedAgentIds,
        distributionStrategy: batch.distributionStrategy,
        auditNotes: batch.auditNotes,
        sampleErrors: batch.errors.slice(0, 8),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Import failed." };
  }
}

export async function importLeadsFileAction(input: {
  leadSourceId: string;
  campaignId?: string;
  sourceFileName: string;
  sheetName?: string;
  rows: Record<string, string>[];
  columnMapping: {
    name: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    source?: string;
    campaign?: string;
    assignedAgent?: string;
    notes?: string;
  };
  skipDuplicates?: boolean;
  duplicateMatchMode?: "phone" | "email" | "phone_name" | "phone_or_email";
  duplicateResolution?: "import_all" | "skip_duplicates" | "merge" | "update_existing";
  agentUserIds?: string[];
  distributionStrategy?: "ROUND_ROBIN" | "EQUAL" | "RANDOM" | "MANUAL";
  manualAssigneeUserId?: string;
}): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.import");
  const { listCampaigns } = await import("@/modules/campaigns");

  const parsed = importLeadsCsvSchema.safeParse({
    leadSourceId: input.leadSourceId,
    campaignId: input.campaignId,
    sourceFileName: input.sourceFileName,
    sheetName: input.sheetName,
    rows: input.rows,
    columnMapping: input.columnMapping,
    skipDuplicates: input.skipDuplicates ?? true,
    duplicateMatchMode: input.duplicateMatchMode,
    duplicateResolution: input.duplicateResolution,
    agentUserIds: input.agentUserIds,
    distributionStrategy: input.distributionStrategy,
    manualAssigneeUserId: input.manualAssigneeUserId,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const campaigns = await listCampaigns(authContext.organizationId);
  const campaignNameToId: Record<string, string> = {};
  for (const campaign of campaigns) {
    campaignNameToId[campaign.name] = campaign.id;
    campaignNameToId[campaign.name.toLowerCase()] = campaign.id;
  }

  try {
    const batch = await importLeadsCsv({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
      campaignNameToId,
    });
    revalidatePath("/leads");
    revalidatePath("/leads/import");
    if (batch.campaignId) {
      revalidatePath(`/campaigns/${batch.campaignId}`);
    }
    revalidatePath("/campaigns");
    return {
      success: `Imported ${batch.createdRowCount} Lead(s). ${batch.updatedCount} updated, ${batch.skippedDuplicateCount} duplicate(s) skipped, ${batch.failedCount} failed.`,
      summary: {
        created: batch.createdRowCount,
        duplicates: batch.skippedDuplicateCount,
        invalid: batch.skippedInvalidCount,
        updated: batch.updatedCount,
        failed: batch.failedCount,
        total: batch.totalRowCount,
        campaignId: batch.campaignId,
        assignedAgentIds: batch.assignedAgentIds,
        distributionStrategy: batch.distributionStrategy,
        auditNotes: batch.auditNotes,
        sampleErrors: batch.errors.slice(0, 8),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Import failed." };
  }
}

export async function previewImportDuplicatesAction(input: {
  rows: Record<string, string>[];
  columnMapping: {
    name: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    source?: string;
    campaign?: string;
    assignedAgent?: string;
    notes?: string;
  };
  matchMode: "phone" | "email" | "phone_name" | "phone_or_email";
}): Promise<{ error?: string; summary?: DuplicateDetectionSummary; reportCsv?: string }> {
  const { authContext } = await requirePermission("lead.import");
  const parsed = previewImportDuplicatesSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const summary = await previewImportDuplicates({
    organizationId: authContext.organizationId,
    rows: parsed.data.rows,
    columnMapping: parsed.data.columnMapping,
    matchMode: parsed.data.matchMode,
  });
  return { summary, reportCsv: buildDuplicateReportCsv(summary) };
}

export async function createCampaignForImportAction(input: {
  name: string;
  description?: string;
  sourceLabel?: string;
  priority?: string;
  memberUserIds?: string[];
  distributionStrategy?: "ROUND_ROBIN" | "EQUAL" | "RANDOM" | "MANUAL";
}): Promise<{ error?: string; campaignId?: string }> {
  const { session, authContext } = await requirePermission("campaign.manage");
  const { createCampaign, createCampaignSchema, addCampaignMember } = await import(
    "@/modules/campaigns"
  );

  const descriptionParts = [
    input.description?.trim(),
    input.sourceLabel ? `Source: ${input.sourceLabel}` : null,
    input.priority ? `Priority: ${input.priority}` : null,
  ].filter(Boolean);

  const parsed = createCampaignSchema.safeParse({
    name: input.name,
    description: descriptionParts.length > 0 ? descriptionParts.join("\n") : undefined,
    memberUserIds: input.memberUserIds,
    distributionStrategy: input.distributionStrategy,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid campaign." };
  }

  try {
    const campaign = await createCampaign({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    for (const userId of input.memberUserIds ?? []) {
      try {
        await addCampaignMember({
          campaignId: campaign.id,
          input: { userId },
          actor: { actorType: "USER", actorId: session.user.id },
        });
      } catch {
        // Member may already exist or be invalid — continue.
      }
    }
    revalidatePath("/campaigns");
    return { campaignId: campaign.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create campaign." };
  }
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
