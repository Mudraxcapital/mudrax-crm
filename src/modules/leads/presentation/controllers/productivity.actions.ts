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
  bulkHardDeleteLeads,
  bulkHardDeleteLeadsSchema,
  createSavedView,
  createSavedViewSchema,
  deleteSavedView,
  importLeadsCsv,
  importLeadsCsvSchema,
  previewImportDuplicates,
  previewImportDuplicatesSchema,
  buildDuplicateReportCsv,
  buildFailedRowsCsv,
  mergeLeads,
  mergeLeadsSchema,
  SavedViewNotFoundError,
  LeadMergeError,
  LeadNotFoundError,
  BulkOperationError,
  type DuplicateDetectionSummary,
} from "@/modules/leads";
import { requirePermission } from "@/infra/auth/session";
import {
  managerBookFilter,
  visibleLeadsFilter,
} from "@/shared/auth/applyHierarchyListFilter";
import { resolveImportOwnership } from "@/shared/auth/resolveImportOwnership";
import { hasRole, requireOwnerManagerId } from "@/modules/rbac";
import {
  LeadAccessDeniedError,
  requireAccessibleLead,
  requireAccessibleLeads,
} from "./requireLeadAccess";

export type ProductivityFormState = {
  error?: string;
  success?: string;
  summary?: {
    created: number;
    /** Total duplicate matches detected in the file. */
    duplicates: number;
    /** Duplicates that were skipped (not imported). */
    skipped: number;
    invalid: number;
    updated: number;
    replaced: number;
    archived: number;
    failed: number;
    total: number;
    campaignId: string | null;
    assignedAgentIds: string[];
    distributionStrategy: string | null;
    auditNotes: string[];
    sampleErrors: Array<{ rowNumber: number; message: string; name?: string; phone?: string }>;
    newFieldsCreated: string[];
    failedCsv?: string;
  };
};

export type DynamicFieldCreateInput = {
  excelHeader: string;
  name: string;
  internalKey?: string;
  fieldType:
    | "TEXT"
    | "TEXTAREA"
    | "NUMBER"
    | "CURRENCY"
    | "PHONE"
    | "EMAIL"
    | "DROPDOWN"
    | "BOOLEAN"
    | "DATE"
    | "DATE_TIME";
  selectOptions?: string[];
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
      campaignId: optional(formData.get("campaignId")),
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

export async function importLeadsFileAction(input: {
  leadSourceId: string;
  campaignId?: string;
  sourceFileName: string;
  sheetName?: string;
  rows: Record<string, string>[];
  columnMapping: Record<string, string | undefined>;
  skipDuplicates?: boolean;
  duplicateMatchMode?: "phone" | "email" | "phone_name" | "phone_or_email";
  duplicateResolution?:
    | "import_all"
    | "skip_duplicates"
    | "merge"
    | "update_existing"
    | "replace_selected_statuses"
    | "archive_and_reimport";
  selectedStageIds?: string[];
  agentUserIds?: string[];
  distributionStrategy?: "ROUND_ROBIN" | "EQUAL" | "RANDOM" | "MANUAL";
  manualAssigneeUserId?: string;
  /** MANUAL percentage split per caller (must sum to 100). */
  percentages?: Record<string, number>;
  /** Admin-selected Manager (or resolved from Team Lead / callers). */
  ownerManagerId?: string;
  /** When true (All agents), allow assignees across Manager books. */
  allowMixedManagers?: boolean;
  /** Unknown Excel columns accepted as new dynamic CRM fields. */
  dynamicFields?: DynamicFieldCreateInput[];
}): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.import");
  const { listCampaigns, DND_CAMPAIGN_NAME } = await import("@/modules/campaigns");
  const {
    createLeadField,
    LeadFieldKeyConflictError,
    LeadFieldNameConflictError,
  } = await import("@/modules/leads");

  const actor = { actorType: "USER" as const, actorId: session.user.id };
  const columnMapping: Record<string, string | undefined> = { ...input.columnMapping };
  const newFieldsCreated: string[] = [];

  for (const field of input.dynamicFields ?? []) {
    try {
      const created = await createLeadField({
        organizationId: authContext.organizationId,
        input: {
          name: field.name,
          internalKey: field.internalKey,
          fieldType: field.fieldType,
          fieldGroup: "SECONDARY",
          isRequired: false,
          isVisible: true,
          isSearchable: true,
          isFilterable: true,
          isImportable: true,
          isExportable: true,
          selectOptions:
            field.fieldType === "DROPDOWN"
              ? field.selectOptions && field.selectOptions.length > 0
                ? field.selectOptions
                : [field.name]
              : field.selectOptions,
        },
        actor,
      });
      columnMapping[created.internalKey] = field.excelHeader;
      newFieldsCreated.push(created.name);
    } catch (error) {
      if (
        error instanceof LeadFieldKeyConflictError ||
        error instanceof LeadFieldNameConflictError
      ) {
        // Field already exists — still map the Excel column onto the key.
        const key =
          field.internalKey?.trim() ||
          field.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
        if (key) columnMapping[key] = field.excelHeader;
        continue;
      }
      return {
        error:
          error instanceof Error
            ? `Failed to create field “${field.name}”: ${error.message}`
            : `Failed to create field “${field.name}”.`,
      };
    }
  }

  if (!columnMapping.full_name && columnMapping.name) {
    columnMapping.full_name = columnMapping.name;
  }

  const uuidOrEmpty =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const cleanId = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed && uuidOrEmpty.test(trimmed) ? trimmed : undefined;
  };

  if (!cleanId(input.leadSourceId)) {
    return {
      error: "Select a valid Lead Source before importing.",
    };
  }

  const parsed = importLeadsCsvSchema.safeParse({
    leadSourceId: cleanId(input.leadSourceId),
    campaignId: cleanId(input.campaignId),
    sourceFileName: input.sourceFileName,
    sheetName: input.sheetName?.trim() || undefined,
    rows: input.rows,
    columnMapping,
    skipDuplicates: input.skipDuplicates ?? true,
    duplicateMatchMode: input.duplicateMatchMode,
    duplicateResolution: input.duplicateResolution,
    selectedStageIds: (input.selectedStageIds ?? [])
      .map((id) => cleanId(id))
      .filter((id): id is string => Boolean(id)),
    agentUserIds: (input.agentUserIds ?? [])
      .map((id) => cleanId(id))
      .filter((id): id is string => Boolean(id)),
    distributionStrategy: input.distributionStrategy,
    manualAssigneeUserId: cleanId(input.manualAssigneeUserId),
    percentages:
      input.distributionStrategy === "MANUAL" && input.percentages
        ? Object.fromEntries(
            Object.entries(input.percentages)
              .map(([userId, value]) => [cleanId(userId), Number(value)] as const)
              .filter((entry): entry is [string, number] => Boolean(entry[0])),
          )
        : undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.join(".") || "input";
    return {
      error: issue ? `${field}: ${issue.message}` : "Invalid input.",
    };
  }

  const book = managerBookFilter(authContext);
  const campaigns = await listCampaigns(authContext.organizationId, book);
  const campaignNameToId: Record<string, string> = {};
  for (const campaign of campaigns) {
    if (campaign.name.trim().toLowerCase() === DND_CAMPAIGN_NAME.toLowerCase()) continue;
    campaignNameToId[campaign.name] = campaign.id;
    campaignNameToId[campaign.name.toLowerCase()] = campaign.id;
  }
  const dndCampaign = campaigns.find(
    (campaign) => campaign.name.trim().toLowerCase() === DND_CAMPAIGN_NAME.toLowerCase(),
  );
  if (dndCampaign && parsed.data.campaignId === dndCampaign.id) {
    return {
      error: `"${DND_CAMPAIGN_NAME}" is a system campaign and cannot be used for Excel import.`,
    };
  }

  try {
    const ownership = await resolveImportOwnership({
      authContext,
      campaignId: parsed.data.campaignId,
      agentUserIds: parsed.data.agentUserIds,
      manualAssigneeUserId: parsed.data.manualAssigneeUserId,
      explicitOwnerManagerId: cleanId(input.ownerManagerId),
      allowMixedManagers: input.allowMixedManagers === true,
    });
    // Batch ownership may be null for All-agents / Direct Admin imports —
    // each Lead inherits Manager/Team Lead from its assignee.
    const batch = await importLeadsCsv({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor,
      campaignNameToId,
      ownerManagerId: ownership.ownerManagerId,
      ownerTeamLeadId: ownership.ownerTeamLeadId,
      existingLeadsFilter: {
        ...visibleLeadsFilter(authContext, {
          permissionCode: "lead.import",
          actorUserId: session.user.id,
        }),
        // Replace/skip/update only against leads already in the target campaign.
        ...(parsed.data.campaignId ? { campaignId: parsed.data.campaignId } : {}),
      },
    });

    // Ensure assigned agents become Campaign members so Callers can see
    // the campaign under Campaigns (membership-scoped).
    if (batch.campaignId && (parsed.data.agentUserIds?.length ?? 0) > 0) {
      const { addCampaignMember } = await import("@/modules/campaigns");
      for (const userId of parsed.data.agentUserIds ?? []) {
        try {
          await addCampaignMember({
            campaignId: batch.campaignId,
            input: { userId },
            actor,
            redistribute: false,
          });
        } catch {
          // Already a member or invalid — continue.
        }
      }
    }
    revalidatePath("/leads");
    revalidatePath("/leads/import");
    revalidatePath("/crm/field-settings");
    if (batch.campaignId) {
      revalidatePath(`/campaigns/${batch.campaignId}`);
    }
    revalidatePath("/campaigns");
    revalidatePath("/customers");
    const fieldsNote =
      newFieldsCreated.length > 0
        ? ` ${newFieldsCreated.length} new field(s) created.`
        : "";
    return {
      success: `Added ${batch.createdRowCount} Lead(s) from Excel. ${batch.updatedCount} updated, ${batch.replacedCount} replaced, ${batch.archivedCount} archived, ${batch.skippedDuplicateCount} duplicate(s) skipped, ${batch.failedCount} failed.${fieldsNote}`,
      summary: {
        created: batch.createdRowCount,
        duplicates: batch.duplicateRowCount,
        skipped: batch.skippedDuplicateCount,
        invalid: batch.skippedInvalidCount,
        updated: batch.updatedCount,
        replaced: batch.replacedCount,
        archived: batch.archivedCount,
        failed: batch.failedCount,
        total: batch.totalRowCount,
        campaignId: batch.campaignId,
        assignedAgentIds: batch.assignedAgentIds,
        distributionStrategy: batch.distributionStrategy,
        auditNotes: [
          ...batch.auditNotes,
          ...(newFieldsCreated.length > 0
            ? [`New fields: ${newFieldsCreated.join(", ")}`]
            : []),
        ],
        sampleErrors: batch.errors.slice(0, 8),
        newFieldsCreated,
        failedCsv: buildFailedRowsCsv(batch.errors),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Add from Excel failed." };
  }
}

export async function previewImportDuplicatesAction(input: {
  rows: Record<string, string>[];
  columnMapping: Record<string, string | undefined>;
  matchMode: "phone" | "email" | "phone_name" | "phone_or_email";
  /** Scope duplicate detection to this campaign (required for same-campaign replace). */
  campaignId?: string;
  /** New campaign — treat all rows as not yet in CRM for this import target. */
  forNewCampaign?: boolean;
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
    // Impossible campaign id → zero CRM matches when importing into a brand-new campaign.
    existingLeadsFilter: parsed.data.forNewCampaign
      ? { campaignId: "00000000-0000-4000-8000-000000000000" }
      : {
          ...visibleLeadsFilter(authContext, {
            permissionCode: "lead.import",
            actorUserId: authContext.userId,
          }),
          ...(parsed.data.campaignId ? { campaignId: parsed.data.campaignId } : {}),
        },
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
  /** Admin-selected Manager (or resolved from Team Lead / callers). */
  ownerManagerId?: string;
}): Promise<{ error?: string; campaignId?: string }> {
  const { session, authContext } = await requirePermission("campaign.manage");
  const { createCampaign, createCampaignSchema, addCampaignMember, DND_CAMPAIGN_NAME } =
    await import("@/modules/campaigns");

  if (input.name.trim().toLowerCase() === DND_CAMPAIGN_NAME.toLowerCase()) {
    return {
      error: `"${DND_CAMPAIGN_NAME}" is a system campaign and cannot be used for Excel import.`,
    };
  }

  const descriptionParts = [
    input.description?.trim(),
    input.sourceLabel ? `Source: ${input.sourceLabel}` : null,
    input.priority ? `Priority: ${input.priority}` : null,
    input.distributionStrategy ? `Distribution: ${input.distributionStrategy}` : null,
  ].filter(Boolean);

  const uuidOrEmpty =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const cleanId = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed && uuidOrEmpty.test(trimmed) ? trimmed : undefined;
  };
  const memberUserIds = (input.memberUserIds ?? [])
    .map((id) => cleanId(id))
    .filter((id): id is string => Boolean(id));

  const parsed = createCampaignSchema.safeParse({
    name: input.name,
    description: descriptionParts.length > 0 ? descriptionParts.join("\n") : undefined,
    memberUserIds,
    distributionStrategy: input.distributionStrategy,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.join(".") || "campaign";
    return { error: issue ? `${field}: ${issue.message}` : "Invalid campaign." };
  }

  try {
    // Prefer explicit / hierarchy-resolved Manager. For All-agents imports the
    // campaign still needs one ownerManagerId column value — use whatever was
    // passed (or resolve from members). Leads keep per-assignee ownership.
    const ownership = await resolveImportOwnership({
      authContext,
      agentUserIds: memberUserIds,
      explicitOwnerManagerId: cleanId(input.ownerManagerId),
    });
    const ownerManagerId = requireOwnerManagerId(
      authContext,
      ownership.ownerManagerId ?? cleanId(input.ownerManagerId),
    );
    const campaign = await createCampaign({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
      ownerManagerId,
    });
    for (const userId of memberUserIds) {
      try {
        await addCampaignMember({
          campaignId: campaign.id,
          input: { userId },
          actor: { actorType: "USER", actorId: session.user.id },
          redistribute: false,
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
    await requireAccessibleLeads(authContext, parsed.data.leadIds, {
      permissionCode: "lead.reassign",
      actorUserId: session.user.id,
    });
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
    if (error instanceof BulkOperationError || error instanceof LeadAccessDeniedError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function bulkChangeLeadStageAction(
  _prev: ProductivityFormState | undefined,
  formData: FormData,
): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.update");
  const leadIds = formData.getAll("leadIds").map(String).filter(Boolean);
  const noteRaw = formData.get("note");
  const parsed = bulkChangeLeadStageSchema.safeParse({
    leadIds,
    stageId: formData.get("stageId"),
    lostReasonId: formData.get("lostReasonId") || undefined,
    note: typeof noteRaw === "string" && noteRaw.trim() ? noteRaw : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    await requireAccessibleLeads(authContext, parsed.data.leadIds, {
      permissionCode: "lead.update",
      actorUserId: session.user.id,
    });
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
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function bulkCloseLeadsAction(
  _prev: ProductivityFormState | undefined,
  formData: FormData,
): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.update");
  const leadIds = formData.getAll("leadIds").map(String).filter(Boolean);
  const closeNoteRaw = formData.get("note");
  const parsed = bulkCloseLeadsSchema.safeParse({
    leadIds,
    lostReasonId: formData.get("lostReasonId"),
    note: typeof closeNoteRaw === "string" ? closeNoteRaw : "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    await requireAccessibleLeads(authContext, parsed.data.leadIds, {
      permissionCode: "lead.update",
      actorUserId: session.user.id,
    });
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
  } catch (error) {
    if (error instanceof LeadAccessDeniedError || error instanceof BulkOperationError) {
      return { error: error.message };
    }
    throw error;
  }
}

/** Admin/Manager only — permanently deletes leads and orphaned customers. */
export async function bulkHardDeleteLeadsAction(
  _prev: ProductivityFormState | undefined,
  formData: FormData,
): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.update");
  if (!hasRole(authContext, "Admin") && !hasRole(authContext, "Manager")) {
    return { error: "Only Admin or Manager can permanently delete leads." };
  }

  const leadIds = formData.getAll("leadIds").map(String).filter(Boolean);
  const parsed = bulkHardDeleteLeadsSchema.safeParse({ leadIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await requireAccessibleLeads(authContext, parsed.data.leadIds, {
      permissionCode: "lead.update",
      actorUserId: session.user.id,
    });
    const result = await bulkHardDeleteLeads({
      organizationId: authContext.organizationId,
      leadIds: parsed.data.leadIds,
    });
    revalidatePath("/leads");
    revalidatePath("/leads/pipeline");
    revalidatePath("/customers");
    revalidatePath("/campaigns");
    return {
      success: `Permanently deleted ${result.succeeded.length} Lead(s) and ${result.deletedCustomerIds.length} Customer(s); ${result.failed.length} failed.`,
    };
  } catch (error) {
    if (error instanceof LeadAccessDeniedError || error instanceof BulkOperationError) {
      return { error: error.message };
    }
    throw error;
  }
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
    await requireAccessibleLeads(
      authContext,
      [parsed.data.survivingLeadId, parsed.data.mergedAwayLeadId],
      {
        permissionCode: "lead.update",
        actorUserId: session.user.id,
      },
    );
    await mergeLeads({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof LeadMergeError ||
      error instanceof LeadNotFoundError ||
      error instanceof SavedViewNotFoundError ||
      error instanceof LeadAccessDeniedError
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
  note?: string;
}): Promise<ProductivityFormState> {
  const { session, authContext } = await requirePermission("lead.update");
  try {
    await requireAccessibleLead(authContext, input.leadId, {
      permissionCode: "lead.update",
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return { error: error.message };
    }
    throw error;
  }
  const result = await bulkChangeLeadStage({
    organizationId: authContext.organizationId,
    input: {
      leadIds: [input.leadId],
      stageId: input.stageId,
      lostReasonId: input.lostReasonId,
      note: input.note,
    },
    actor: { actorType: "USER", actorId: session.user.id },
  });
  if (result.failed[0]) return { error: result.failed[0].error };
  revalidatePath("/leads/pipeline");
  revalidatePath(`/leads/${input.leadId}`);
  return { success: "Stage updated." };
}
