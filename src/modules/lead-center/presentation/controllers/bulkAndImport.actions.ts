"use server";

// ============================================================================
// src/modules/lead-center/presentation/controllers/bulkAndImport.actions.ts
// Campaign import from Lead Center (Facebook / Google / WhatsApp / all).
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  hasPermission,
  isCallerWorkspaceUser,
  resolveOwnerManagerId,
} from "@/modules/rbac";
import {
  importStagedLeadsToCampaign,
  IngestionValidationError,
  isLeadCenterImportScope,
  previewCampaignImport,
  type CampaignImportAllocation,
  type LeadCenterImportScope,
} from "@/modules/lead-center";
import { managerBookFilter, leadHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

export interface BulkActionState {
  error?: string;
  success?: string;
  preview?: Array<{
    stagedLeadId: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    duplicateStatus: string;
    validationStatus: string;
    action: "import" | "skip";
    reason?: string;
  }>;
  importedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  campaignId?: string;
}

async function requireImportContext() {
  const current = await requirePermission("lead_center.import");
  if (isCallerWorkspaceUser(current.authContext)) {
    throw new IngestionValidationError("Callers cannot import from Lead Center.");
  }
  return current;
}

function parseSourceScope(formData: FormData): LeadCenterImportScope {
  const raw = String(formData.get("sourceScope") ?? "ALL").trim();
  if (!isLeadCenterImportScope(raw)) {
    throw new IngestionValidationError(
      "Choose Facebook, Google, WhatsApp, or all three sources.",
    );
  }
  return raw;
}

function bookScope(authContext: Parameters<typeof managerBookFilter>[0]) {
  const book = managerBookFilter(authContext);
  const hierarchy = leadHierarchyFilter(authContext);
  return {
    scopeOwnerManagerId: book.ownerManagerId ?? null,
    scopeOwnerTeamLeadId: hierarchy.ownerTeamLeadId ?? null,
    ownerTeamLeadId: hierarchy.ownerTeamLeadId ?? null,
  };
}

export async function previewImportAction(
  _prev: BulkActionState | undefined,
  formData: FormData,
): Promise<BulkActionState> {
  try {
    const { authContext } = await requireImportContext();
    const scope = bookScope(authContext);
    const sourceScope = parseSourceScope(formData);
    const preview = await previewCampaignImport({
      organizationId: authContext.organizationId,
      sourceScope,
      includeExactDuplicates: formData.get("includeExactDuplicates") === "1",
      includeInvalid: formData.get("includeInvalid") === "1",
      ...scope,
    });
    const importable = preview.filter((row) => row.action === "import").length;
    return {
      success: `Preview (${sourceScope}): ${importable} will import, ${preview.length - importable} skipped.`,
      preview,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Preview failed." };
  }
}

export async function importToCampaignAction(
  _prev: BulkActionState | undefined,
  formData: FormData,
): Promise<BulkActionState> {
  try {
    const { session, authContext } = await requireImportContext();
    const canCreateCampaign = hasPermission(authContext, "campaign.manage");
    const scope = bookScope(authContext);
    const sourceScope = parseSourceScope(formData);
    const ownerManagerId =
      resolveOwnerManagerId(
        authContext,
        String(formData.get("ownerManagerId") ?? "").trim() || scope.scopeOwnerManagerId,
      ) ?? scope.scopeOwnerManagerId;

    if (!ownerManagerId) {
      return { error: "A Manager owner is required to import into a campaign." };
    }

    const mode = String(formData.get("campaignMode") ?? "existing");
    const newName = String(formData.get("newCampaignName") ?? "").trim();
    if (mode === "new" && !canCreateCampaign) {
      return { error: "You do not have permission to create campaigns." };
    }
    if (mode === "new" && newName.length < 2) {
      return { error: "Enter a campaign name (min 2 characters)." };
    }

    const allocation = (String(formData.get("allocationMethod") ?? "NONE") ||
      "NONE") as CampaignImportAllocation;

    const result = await importStagedLeadsToCampaign({
      organizationId: authContext.organizationId,
      sourceScope,
      actor: { type: "USER", id: session.user.id },
      campaignId: mode === "existing" ? String(formData.get("campaignId") ?? "").trim() : null,
      newCampaign:
        mode === "new"
          ? {
              name: newName,
              description: String(formData.get("newCampaignDescription") ?? "").trim() || undefined,
            }
          : null,
      ownerManagerId,
      ownerTeamLeadId: scope.ownerTeamLeadId,
      scopeOwnerManagerId: scope.scopeOwnerManagerId,
      scopeOwnerTeamLeadId: scope.scopeOwnerTeamLeadId,
      allowedCampaignOwnerManagerId:
        authContext.hierarchy.primaryRole === "Team Lead" ? ownerManagerId : null,
      allocationMethod: allocation,
      manualAssigneeUserId:
        String(formData.get("manualAssigneeUserId") ?? "").trim() || null,
      includeExactDuplicates: formData.get("includeExactDuplicates") === "1",
      includeInvalid: formData.get("includeInvalid") === "1",
    });

    revalidatePath("/lead-center");
    revalidatePath("/campaigns");
    revalidatePath("/leads");
    return {
      success: `Imported ${result.importedCount} lead(s) into ${result.campaignName}. Skipped ${result.skippedCount}, failed ${result.failedCount}.`,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      campaignId: result.campaignId,
      preview: result.preview,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Campaign import failed." };
  }
}
