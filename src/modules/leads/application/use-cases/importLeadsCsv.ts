// ============================================================================
// src/modules/leads/application/use-cases/importLeadsCsv.ts
//
// CSV/Excel bulk Lead intake → Import Batch → Import Rows → Lead creation
// with column mapping, configurable duplicate handling, and agent distribution.
// ============================================================================

import { parseCsv } from "@/shared/csv/csv";
import type {
  LeadRepository,
  ListLeadsFilter,
} from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { ImportBatchRepository } from "../../domain/repositories/ImportBatchRepository";
import type { LeadNoteRepository } from "../../domain/repositories/LeadNoteRepository";
import type { LeadFieldDefinitionRepository } from "../../domain/repositories/LeadFieldDefinitionRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import type { CustomerLookupPort } from "../ports/CustomerLookupPort";
import type { UserLookupPort } from "../ports/UserLookupPort";
import {
  ImportBatchNotFoundError,
  InvalidLeadSourceReferenceError,
  InvalidLeadStageReferenceError,
  LeadAlreadyClosedError,
} from "../../domain/errors/LeadErrors";
import type { ImportLeadsCsvInput } from "../validators/productivitySchemas";
import { validateLeadFieldValues } from "../validators/leadFieldSchemas";
import { partitionSystemAndCustom } from "../services/leadFieldValues";
import { importableFields } from "../dto/LeadFieldDefinitionDto";
import { toImportBatchDto, type ImportBatchDto } from "../dto/ImportBatchDto";
import {
  classifyImportDuplicates,
  type DuplicateMatchMode,
  type DuplicateResolutionMode,
} from "./detectImportDuplicates";
import { previewLeadDistribution } from "./previewLeadDistribution";
import { makeChangeLeadStage } from "./changeLeadStage";

export interface ImportLeadsSummary extends ImportBatchDto {
  skippedInvalidCount: number;
  skippedDuplicateCount: number;
  updatedCount: number;
  replacedCount: number;
  archivedCount: number;
  failedCount: number;
  distributionStrategy: string | null;
  assignedAgentIds: string[];
  errors: Array<{ rowNumber: number; message: string; name?: string; phone?: string }>;
  rolledBack: boolean;
  auditNotes: string[];
}

type ColumnMapping = NonNullable<ImportLeadsCsvInput["columnMapping"]>;

function mappedCell(row: Record<string, string>, header: string | undefined): string {
  if (!header) return "";
  return (row[header] ?? "").trim();
}

function mapGet(mapping: ColumnMapping, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const hit = mapping[key];
    if (hit) return hit;
  }
  return undefined;
}

function defaultMapping(
  headers: string[],
  fieldKeys: Array<{ internalKey: string; name: string }>,
): ColumnMapping {
  const lower = new Map(headers.map((h) => [h.toLowerCase(), h]));
  const pick = (...aliases: string[]) => {
    for (const alias of aliases) {
      const hit = lower.get(alias.toLowerCase());
      if (hit) return hit;
    }
    return undefined;
  };
  const mapping: ColumnMapping = {
    full_name:
      pick("fullName", "name", "full_name", "full name", "customer name", "lead name") ??
      headers[0] ??
      "name",
    phone: pick(
      "phone",
      "phoneSnapshot",
      "mobile",
      "mobile number",
      "lead id",
      "leadid",
      "lead_id",
    ),
    email: pick("email", "emailSnapshot", "email address"),
    city: pick("city"),
    state: pick("state", "province"),
    source: pick("source", "lead source", "leadSource"),
    campaign: pick("campaign", "campaign name"),
    assignedAgent: pick("assigned agent", "agent", "assignee", "assigned to", "owner"),
    notes: pick("notes", "note", "comments"),
  };

  for (const field of fieldKeys) {
    if (mapping[field.internalKey]) continue;
    const hit =
      pick(field.internalKey, field.name, field.name.replace(/\s+/g, "_")) ??
      pick(...field.name.toLowerCase().split(/\s+/));
    if (hit) mapping[field.internalKey] = hit;
  }
  return mapping;
}

function normalizeMapping(mapping: ColumnMapping): ColumnMapping {
  const next = { ...mapping };
  if (!next.full_name && next.name) next.full_name = next.name;
  return next;
}

function resolveAgentId(
  raw: string,
  agents: Array<{ id: string; fullName?: string; email?: string; status: string }>,
): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  const byEmail = agents.find((agent) => agent.email?.toLowerCase() === key);
  if (byEmail && byEmail.status === "ACTIVE") return byEmail.id;
  const byName = agents.find((agent) => agent.fullName?.toLowerCase() === key);
  if (byName && byName.status === "ACTIVE") return byName.id;
  return null;
}

/** Ownership for a newly created Lead — prefer assignee hierarchy when present. */
async function ownershipForAssignee(
  userLookup: UserLookupPort,
  agentId: string | null | undefined,
  fallback: { ownerManagerId: string | null; ownerTeamLeadId: string | null },
): Promise<{ ownerManagerId: string | null; ownerTeamLeadId: string | null }> {
  if (!agentId) return fallback;
  const user = await userLookup.findById(agentId);
  if (!user?.roleName) return fallback;

  if (user.roleName === "Caller" && !user.assignedTeamLeadId) {
    return { ownerManagerId: null, ownerTeamLeadId: null };
  }
  if (user.roleName === "Team Lead") {
    return {
      ownerManagerId: user.reportingManagerId ?? null,
      ownerTeamLeadId: user.id,
    };
  }
  if (user.roleName === "Caller" && user.assignedTeamLeadId) {
    const teamLead = await userLookup.findById(user.assignedTeamLeadId);
    return {
      ownerManagerId: teamLead?.reportingManagerId ?? null,
      ownerTeamLeadId: user.assignedTeamLeadId,
    };
  }
  if (user.roleName === "Manager") {
    return { ownerManagerId: user.id, ownerTeamLeadId: null };
  }
  if (user.roleName === "Admin") {
    return { ownerManagerId: null, ownerTeamLeadId: null };
  }
  return fallback;
}

function resolveDuplicateMode(input: ImportLeadsCsvInput): DuplicateResolutionMode {
  if (input.duplicateResolution) return input.duplicateResolution;
  return input.skipDuplicates ? "skip_duplicates" : "import_all";
}

export function makeImportLeadsCsv(
  importRepository: ImportBatchRepository,
  leadRepository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  customerLookup: CustomerLookupPort,
  userLookup: UserLookupPort,
  noteRepository: LeadNoteRepository,
  fieldRepository: LeadFieldDefinitionRepository,
) {
  const changeLeadStage = makeChangeLeadStage(leadRepository, catalogRepository);

  return async function importLeadsCsv(command: {
    organizationId: string;
    input: ImportLeadsCsvInput;
    actor: LeadAuditActor;
    /** Optional campaign name → id map from the presentation layer (avoids campaigns→leads cycle). */
    campaignNameToId?: Record<string, string>;
    ownerManagerId?: string | null;
    ownerTeamLeadId?: string | null;
    /**
     * Hierarchy scope for duplicate matching — Managers/Team Leads must not
     * inspect Leads outside their book. Admin passes undefined (org-wide).
     */
    existingLeadsFilter?: ListLeadsFilter;
  }): Promise<ImportLeadsSummary> {
    const { organizationId, input, actor, campaignNameToId = {} } = command;
    const ownerManagerId = command.ownerManagerId ?? null;
    const ownerTeamLeadId = command.ownerTeamLeadId ?? null;

    const source = await catalogRepository.findSourceById(input.leadSourceId);
    if (!source || source.organizationId !== organizationId) {
      throw new InvalidLeadSourceReferenceError(input.leadSourceId);
    }

    const defaultStage = await catalogRepository.findDefaultStage(organizationId);
    if (!defaultStage) {
      throw new InvalidLeadStageReferenceError("(no default Lead Stage configured)");
    }

    if (!customerLookup.resolveOrCreate) {
      throw new Error("Customer resolveOrCreate port is required for CSV import.");
    }

    const allFields = await fieldRepository.listActive(organizationId);
    const fieldsForImport = importableFields(allFields);

    const [sources, stages, lostReasons] = await Promise.all([
      catalogRepository.listSources(organizationId),
      catalogRepository.listStages(organizationId),
      catalogRepository.listLostReasons(organizationId),
    ]);
    const sourceByName = new Map(sources.map((item) => [item.name.trim().toLowerCase(), item.id]));
    const stageById = new Map(stages.map((stage) => [stage.id, stage]));
    const lostStage = stages.find(
      (stage) => stage.bucket === "CLOSED" && stage.closeOutcome === "LOST" && stage.isActive,
    );
    const replaceLostReason =
      lostReasons.find((reason) => /replaced|import/i.test(reason.name)) ??
      lostReasons.find((reason) => /duplicate/i.test(reason.name)) ??
      lostReasons[0];
    const archiveLostReason =
      lostReasons.find((reason) => /archiv/i.test(reason.name)) ??
      lostReasons.find((reason) => /duplicate/i.test(reason.name)) ??
      lostReasons[0];
    const selectedStageIds = new Set(input.selectedStageIds ?? []);

    const agents = userLookup.listByOrganization
      ? await userLookup.listByOrganization(organizationId)
      : [];
    const activeAgents = agents.filter((agent) => agent.status === "ACTIVE");

    const batch = await importRepository.create({
      organizationId,
      uploadedByUserId: actor.actorId ?? organizationId,
      leadSourceId: input.leadSourceId,
      campaignId: input.campaignId ?? null,
      ownerManagerId,
      ownerTeamLeadId,
      sourceFileName: input.sourceFileName,
    });

    const tableRows =
      input.rows && input.rows.length > 0 ? input.rows : parseCsv(input.csvText ?? "").rows;

    const headers =
      tableRows.length > 0
        ? Object.keys(tableRows[0]!)
        : parseCsv(input.csvText ?? "").headers;
    const mapping = normalizeMapping(
      input.columnMapping ??
        defaultMapping(
          headers,
          fieldsForImport.map((field) => ({
            internalKey: field.internalKey,
            name: field.name,
          })),
        ),
    );
    const nameHeader = mapGet(mapping, "full_name", "name");
    const phoneHeader = mapGet(mapping, "phone");
    const emailHeader = mapGet(mapping, "email");
    const duplicateResolution = resolveDuplicateMode(input);
    const matchMode: DuplicateMatchMode = input.duplicateMatchMode ?? "phone";

    const existingLeads = await leadRepository.list(organizationId, {
      ...command.existingLeadsFilter,
      limit: command.existingLeadsFilter?.limit ?? 100_000,
    });
    const classifications = classifyImportDuplicates({
      rows: tableRows.map((row, index) => ({
        rowNumber: index + 1,
        name: mappedCell(row, nameHeader),
        phone: mappedCell(row, phoneHeader),
        email: mappedCell(row, emailHeader),
      })),
      existingLeads: existingLeads.map((lead) => {
        const stage = stageById.get(lead.currentStageId);
        return {
          id: lead.id,
          customerId: lead.customerId,
          fullNameSnapshot: lead.fullNameSnapshot,
          phoneSnapshot: lead.phoneSnapshot,
          emailSnapshot: lead.emailSnapshot,
          currentStageId: lead.currentStageId,
          currentStageName: stage?.name ?? "Unassigned status",
          stageBucket: stage?.bucket ?? "ACTIVE",
          stageSortOrder: stage?.sortOrder ?? 0,
          updatedAt: lead.updatedAt,
        };
      }),
      matchMode,
      stages,
    });
    const classByRow = new Map(
      [
        ...classifications.newLeads,
        ...classifications.possibleDuplicates,
        ...classifications.exactDuplicates,
      ].map((item) => [item.rowNumber, item]),
    );

    const isStatusStrategy =
      duplicateResolution === "replace_selected_statuses" ||
      duplicateResolution === "archive_and_reimport";

    // Rows that will become new leads (for distribution sizing).
    const importableIndexes: number[] = [];
    for (let index = 0; index < tableRows.length; index++) {
      const row = tableRows[index]!;
      const fullName = mappedCell(row, nameHeader);
      const phone = mappedCell(row, phoneHeader);
      const email = mappedCell(row, emailHeader);
      if (!fullName || (!phone && !email)) continue;
      const classification = classByRow.get(index + 1);
      const isDup =
        classification?.category === "exact" || classification?.category === "possible";
      if (isDup && duplicateResolution === "skip_duplicates") continue;
      if (isDup && (duplicateResolution === "update_existing" || duplicateResolution === "merge")) {
        continue; // handled as update path, not new create
      }
      if (isDup && isStatusStrategy) {
        const stageId = classification?.existingStageId;
        if (!stageId || !selectedStageIds.has(stageId)) continue;
      }
      importableIndexes.push(index);
    }

    const selectedAgentIds = (input.agentUserIds ?? []).filter((id) =>
      activeAgents.some((agent) => agent.id === id),
    );
    const distributionAgents = (
      selectedAgentIds.length > 0
        ? selectedAgentIds
        : []
    ).map((id) => {
      const agent = activeAgents.find((item) => item.id === id)!;
      return { userId: agent.id, fullName: agent.fullName ?? agent.id, availability: "AVAILABLE" as const };
    });

    const strategy = input.distributionStrategy;
    const distribution =
      strategy && distributionAgents.length > 0
        ? previewLeadDistribution({
            leadCount: importableIndexes.length,
            strategy,
            agents: distributionAgents,
            manualAssigneeUserId: input.manualAssigneeUserId,
          })
        : null;

    const assigneeByImportableIndex = new Map<number, string>();
    if (distribution) {
      for (const assignment of distribution.assignments) {
        const sourceIndex = importableIndexes[assignment.rowIndex];
        if (sourceIndex != null) {
          assigneeByImportableIndex.set(sourceIndex, assignment.userId);
        }
      }
    }

    // Updates / merges also receive agents via round-robin over selected agents.
    const updateAssigneeByRowIndex = new Map<number, string>();
    if (selectedAgentIds.length > 0) {
      let cursor = 0;
      for (let index = 0; index < tableRows.length; index++) {
        const classification = classByRow.get(index + 1);
        const isDup =
          classification?.category === "exact" || classification?.category === "possible";
        if (
          isDup &&
          (duplicateResolution === "update_existing" || duplicateResolution === "merge")
        ) {
          const agentId =
            input.distributionStrategy === "MANUAL" && input.manualAssigneeUserId
              ? input.manualAssigneeUserId
              : selectedAgentIds[cursor % selectedAgentIds.length]!;
          updateAssigneeByRowIndex.set(index, agentId);
          cursor += 1;
        }
      }
    }

    const now = new Date();
    let createdRowCount = 0;
    let duplicateRowCount = 0;
    let skippedInvalidCount = 0;
    let skippedDuplicateCount = 0;
    let updatedCount = 0;
    let replacedCount = 0;
    let archivedCount = 0;
    let failedCount = 0;
    const errors: Array<{ rowNumber: number; message: string; name?: string; phone?: string }> = [];
    const createdLeadIds: string[] = [];
    const assignedAgentIds = new Set<string>();
    const auditNotes: string[] = [
      `File: ${input.sourceFileName}`,
      input.sheetName ? `Sheet: ${input.sheetName}` : null,
      `Duplicate detection based on: ${classifications.matchLabel}`,
      `Duplicate resolution: ${duplicateResolution}`,
      selectedStageIds.size > 0 ? `Selected statuses: ${selectedStageIds.size}` : null,
      strategy ? `Distribution: ${strategy}` : null,
      selectedAgentIds.length > 0 ? `Agents: ${selectedAgentIds.length}` : null,
    ].filter((item): item is string => Boolean(item));
    const importRows = [];
    let rolledBack = false;

    try {
      for (let index = 0; index < tableRows.length; index++) {
        const row = tableRows[index]!;
        const rowNumber = index + 1;
        const fullName = mappedCell(row, nameHeader);
        const phone = mappedCell(row, phoneHeader);
        const email = mappedCell(row, emailHeader);
        const city = mappedCell(row, mapGet(mapping, "city"));
        const state = mappedCell(row, mapGet(mapping, "state"));
        const sourceName = mappedCell(row, mapGet(mapping, "source"));
        const campaignName = mappedCell(row, mapGet(mapping, "campaign"));
        const agentRaw = mappedCell(row, mapGet(mapping, "assignedAgent"));
        const notes = mappedCell(row, mapGet(mapping, "notes"));

        const dynamicValues: Record<string, unknown> = {
          full_name: fullName,
          phone,
          email,
        };
        for (const field of fieldsForImport) {
          if (field.internalKey === "full_name" || field.internalKey === "phone" || field.internalKey === "email") {
            continue;
          }
          const header = mapping[field.internalKey];
          if (header) dynamicValues[field.internalKey] = mappedCell(row, header);
        }
        const validatedFields = validateLeadFieldValues(fieldsForImport, dynamicValues);
        if (!validatedFields.ok) {
          skippedInvalidCount += 1;
          failedCount += 1;
          errors.push({
            rowNumber,
            message: validatedFields.error,
            name: fullName,
            phone,
          });
          importRows.push({
            importBatchId: batch.id,
            rowNumber,
            rawData: row,
            parseStatus: "INVALID" as const,
            parseErrors: [validatedFields.error],
          });
          continue;
        }
        const { systemUpdates, customValues } = partitionSystemAndCustom(
          fieldsForImport,
          validatedFields.values,
        );

        const classification = classByRow.get(rowNumber);
        const isDuplicate =
          classification?.category === "exact" || classification?.category === "possible";

        if (!fullName) {
          skippedInvalidCount += 1;
          failedCount += 1;
          errors.push({ rowNumber, message: "Name is required", name: fullName, phone });
          importRows.push({
            importBatchId: batch.id,
            rowNumber,
            rawData: row,
            parseStatus: "INVALID" as const,
            parseErrors: ["Name is required"],
          });
          continue;
        }

        if (!phone && !email) {
          skippedInvalidCount += 1;
          failedCount += 1;
          errors.push({
            rowNumber,
            message: "Phone or Email is required",
            name: fullName,
            phone,
          });
          importRows.push({
            importBatchId: batch.id,
            rowNumber,
            rawData: row,
            parseStatus: "INVALID" as const,
            parseErrors: ["Phone or Email is required"],
          });
          continue;
        }

        try {
          if (isDuplicate) {
            duplicateRowCount += 1;

            if (duplicateResolution === "skip_duplicates") {
              skippedDuplicateCount += 1;
              importRows.push({
                importBatchId: batch.id,
                rowNumber,
                rawData: row,
                parseStatus: "INVALID" as const,
                parseErrors: [`Duplicate (${classification?.matchReason ?? "match"}) — skipped`],
                resolvedCustomerId: classification?.existingCustomerId ?? null,
              });
              continue;
            }

            if (isStatusStrategy) {
              const stageId = classification?.existingStageId;
              if (!stageId || !selectedStageIds.has(stageId)) {
                skippedDuplicateCount += 1;
                importRows.push({
                  importBatchId: batch.id,
                  rowNumber,
                  rawData: row,
                  parseStatus: "INVALID" as const,
                  parseErrors: [
                    `Duplicate in status “${classification?.existingStageName ?? "unknown"}” — not selected; skipped`,
                  ],
                  resolvedCustomerId: classification?.existingCustomerId ?? null,
                });
                continue;
              }

              if (!lostStage || !replaceLostReason) {
                throw new InvalidLeadStageReferenceError(
                  "(no Closed-Lost Lead Stage / Lost Reason configured for replace/archive)",
                );
              }

              const existingLeadId = classification?.existingLeadId;
              if (existingLeadId) {
                try {
                  await changeLeadStage({
                    id: existingLeadId,
                    input: {
                      stageId: lostStage.id,
                      lostReasonId:
                        duplicateResolution === "archive_and_reimport"
                          ? archiveLostReason!.id
                          : replaceLostReason.id,
                    },
                    actor,
                    correlationId: batch.id,
                  });
                  if (duplicateResolution === "archive_and_reimport") {
                    archivedCount += 1;
                  } else {
                    replacedCount += 1;
                  }
                  if (actor.actorId) {
                    await noteRepository.createWithAudit(
                      {
                        leadId: existingLeadId,
                        authorUserId: actor.actorId,
                        body:
                          duplicateResolution === "archive_and_reimport"
                            ? `Archived via import from ${input.sourceFileName} row ${rowNumber} (history retained).`
                            : `Replaced via import from ${input.sourceFileName} row ${rowNumber} (closed before re-import).`,
                      },
                      actor,
                    );
                  }
                } catch (closeError) {
                  if (!(closeError instanceof LeadAlreadyClosedError)) {
                    throw closeError;
                  }
                  // Already closed — still allow creating the fresh copy.
                }
              }
              // Fall through to create a new Lead from the Excel row.
            } else if (
              (duplicateResolution === "update_existing" || duplicateResolution === "merge") &&
              classification?.existingLeadId
            ) {
              const existing = await leadRepository.findById(classification.existingLeadId);
              if (existing && existing.organizationId === organizationId) {
                await leadRepository.updateWithAudit(
                  existing.id,
                  {
                    fullNameSnapshot: systemUpdates.fullNameSnapshot ?? fullName,
                    phoneSnapshot:
                      systemUpdates.phoneSnapshot || phone || existing.phoneSnapshot,
                    emailSnapshot:
                      systemUpdates.emailSnapshot || email || existing.emailSnapshot,
                  },
                  actor,
                );
                if (customValues.length > 0) {
                  await fieldRepository.upsertValuesForLead(existing.id, customValues);
                }
                const resolvedCampaignId =
                  (campaignName
                    ? campaignNameToId[campaignName.toLowerCase()] ?? campaignNameToId[campaignName]
                    : undefined) ??
                  input.campaignId ??
                  existing.campaignId;
                if (
                  actor.actorId &&
                  resolvedCampaignId &&
                  resolvedCampaignId !== existing.campaignId
                ) {
                  await noteRepository.createWithAudit(
                    {
                      leadId: existing.id,
                      authorUserId: actor.actorId,
                      body: `Import update (${duplicateResolution}): campaign target ${resolvedCampaignId}`,
                    },
                    actor,
                  );
                }
                const distAgent = updateAssigneeByRowIndex.get(index);
                const fileAgent = resolveAgentId(agentRaw, activeAgents);
                const agentId = distAgent ?? fileAgent;
                if (agentId) {
                  await leadRepository.assignWithAudit(
                    existing.id,
                    {
                      assignedToUserId: agentId,
                      assignedByUserId: actor.actorId ?? null,
                      assignmentType: "MANUAL_REASSIGNMENT",
                    },
                    actor,
                  );
                  assignedAgentIds.add(agentId);
                }
                if (actor.actorId) {
                  await noteRepository.createWithAudit(
                    {
                      leadId: existing.id,
                      authorUserId: actor.actorId,
                      body: `Updated via import (${duplicateResolution}) from ${input.sourceFileName} row ${rowNumber}`,
                    },
                    actor,
                  );
                }
                updatedCount += 1;
                importRows.push({
                  importBatchId: batch.id,
                  rowNumber,
                  rawData: row,
                  parseStatus: "PARSED" as const,
                  parseErrors: null,
                  resolvedCustomerId: existing.customerId,
                });
                continue;
              }
            }

            // import_all / replace / archive fall through to create a new Lead.
            if (
              duplicateResolution !== "import_all" &&
              duplicateResolution !== "replace_selected_statuses" &&
              duplicateResolution !== "archive_and_reimport"
            ) {
              skippedDuplicateCount += 1;
              importRows.push({
                importBatchId: batch.id,
                rowNumber,
                rawData: row,
                parseStatus: "INVALID" as const,
                parseErrors: ["Duplicate could not be resolved — skipped"],
                resolvedCustomerId: classification?.existingCustomerId ?? null,
              });
              continue;
            }
          }

          const distAgent = assigneeByImportableIndex.get(index);
          const fileAgent = resolveAgentId(agentRaw, activeAgents);
          const agentId = distAgent ?? fileAgent;
          if (agentId) assignedAgentIds.add(agentId);

          const leadOwnership = await ownershipForAssignee(userLookup, agentId, {
            ownerManagerId,
            ownerTeamLeadId,
          });

          const customer = await customerLookup.resolveOrCreate!({
            organizationId,
            fullName,
            phone: phone || null,
            email: email || null,
            actorUserId: actor.actorId ?? organizationId,
            ownerManagerId: leadOwnership.ownerManagerId,
          });

          const resolvedSourceId =
            (sourceName ? sourceByName.get(sourceName.toLowerCase()) : undefined) ??
            input.leadSourceId;

          const resolvedCampaignId =
            (campaignName
              ? campaignNameToId[campaignName.toLowerCase()] ?? campaignNameToId[campaignName]
              : undefined) ??
            input.campaignId ??
            null;

          const lead = await leadRepository.createWithAudit(
            {
              organizationId,
              customerId: customer.id,
              leadSourceId: resolvedSourceId,
              currentStageId: defaultStage.id,
              campaignId: resolvedCampaignId,
              ownerManagerId: leadOwnership.ownerManagerId,
              ownerTeamLeadId: leadOwnership.ownerTeamLeadId,
              fullNameSnapshot: systemUpdates.fullNameSnapshot ?? fullName,
              phoneSnapshot: systemUpdates.phoneSnapshot || phone || null,
              emailSnapshot: systemUpdates.emailSnapshot || email || null,
              initialAssignment: agentId
                ? {
                    assignedToUserId: agentId,
                    assignedByUserId: actor.actorId ?? null,
                    assignmentType: "INITIAL",
                  }
                : null,
            },
            actor,
          );
          if (customValues.length > 0) {
            await fieldRepository.upsertValuesForLead(lead.id, customValues);
          }
          createdLeadIds.push(lead.id);
          createdRowCount += 1;

          const noteParts = [
            notes,
            city ? `City: ${city}` : "",
            state ? `State: ${state}` : "",
            `Imported from ${input.sourceFileName}${input.sheetName ? ` / ${input.sheetName}` : ""} (row ${rowNumber})`,
            isDuplicate ? `Imported despite duplicate (${classification?.matchReason})` : "",
          ].filter(Boolean);
          if (noteParts.length > 0 && actor.actorId) {
            await noteRepository.createWithAudit(
              {
                leadId: lead.id,
                authorUserId: actor.actorId,
                body: noteParts.join("\n"),
              },
              actor,
            );
          }

          importRows.push({
            importBatchId: batch.id,
            rowNumber,
            rawData: row,
            parseStatus: "PARSED" as const,
            parseErrors: null,
            resolvedCustomerId: customer.id,
          });
        } catch (error) {
          skippedInvalidCount += 1;
          failedCount += 1;
          const message = error instanceof Error ? error.message : "Import row failed";
          errors.push({ rowNumber, message, name: fullName, phone });
          importRows.push({
            importBatchId: batch.id,
            rowNumber,
            rawData: row,
            parseStatus: "INVALID" as const,
            parseErrors: [message],
          });
        }
      }

      await importRepository.createRows(importRows);
      const updated = await importRepository.updateCounts(batch.id, {
        status: "COMPLETED",
        totalRowCount: tableRows.length,
        createdRowCount,
        duplicateRowCount,
        parsedAt: now,
        committedAt: now,
        completedAt: now,
      });

      return {
        ...toImportBatchDto(updated),
        skippedInvalidCount,
        skippedDuplicateCount,
        updatedCount,
        replacedCount,
        archivedCount,
        failedCount,
        distributionStrategy: strategy ?? null,
        assignedAgentIds: [...assignedAgentIds],
        errors,
        rolledBack: false,
        auditNotes: [
          ...auditNotes,
          `Excel rows: ${tableRows.length}`,
          `Duplicates: ${duplicateRowCount}`,
          `Imported: ${createdRowCount}`,
          `Skipped: ${skippedDuplicateCount}`,
          `Replaced: ${replacedCount}`,
          `Archived: ${archivedCount}`,
          `Failed: ${failedCount}`,
        ],
      };
    } catch (criticalError) {
      rolledBack = createdLeadIds.length > 0;
      try {
        if (importRows.length > 0) {
          await importRepository.createRows(importRows);
        }
        await importRepository.updateCounts(batch.id, {
          status: "PARSED",
          totalRowCount: tableRows.length,
          createdRowCount,
          duplicateRowCount,
          parsedAt: now,
        });
      } catch {
        // Best-effort audit persistence.
      }

      const message =
        criticalError instanceof Error ? criticalError.message : "Critical import failure";
      throw new Error(
        rolledBack
          ? `Import interrupted after creating ${createdLeadIds.length} Lead(s): ${message}. Batch ${batch.id} was left incomplete for audit.`
          : message,
      );
    }
  };
}

export function makeListImportBatches(importRepository: ImportBatchRepository) {
  return async function listImportBatches(
    organizationId: string,
    options?: {
      campaignId?: string;
      ownerManagerId?: string;
      ownerTeamLeadId?: string;
      limit?: number;
    },
  ): Promise<ImportBatchDto[]> {
    const batches = await importRepository.list(organizationId, options?.limit ?? 50);
    let filtered = batches;
    if (options?.campaignId) {
      filtered = filtered.filter((batch) => batch.campaignId === options.campaignId);
    }
    if (options?.ownerManagerId) {
      filtered = filtered.filter((batch) => batch.ownerManagerId === options.ownerManagerId);
    }
    if (options?.ownerTeamLeadId) {
      filtered = filtered.filter((batch) => batch.ownerTeamLeadId === options.ownerTeamLeadId);
    }
    return filtered.map(toImportBatchDto);
  };
}

export function makeGetImportBatch(importRepository: ImportBatchRepository) {
  return async function getImportBatch(id: string): Promise<ImportBatchDto> {
    const batch = await importRepository.findById(id);
    if (!batch) throw new ImportBatchNotFoundError(id);
    return toImportBatchDto(batch);
  };
}

export function makePreviewImportDuplicates(
  leadRepository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function previewImportDuplicates(command: {
    organizationId: string;
    rows: Record<string, string>[];
    columnMapping: ColumnMapping;
    matchMode: DuplicateMatchMode;
    /** Hierarchy scope — same filter as import duplicate matching. */
    existingLeadsFilter?: ListLeadsFilter;
  }) {
    const { organizationId, rows, columnMapping, matchMode } = command;
    const mapping = normalizeMapping(columnMapping);
    const nameHeader = mapGet(mapping, "full_name", "name");
    const phoneHeader = mapGet(mapping, "phone");
    const emailHeader = mapGet(mapping, "email");

    const [existingLeads, stages] = await Promise.all([
      leadRepository.list(organizationId, {
        ...command.existingLeadsFilter,
        limit: command.existingLeadsFilter?.limit ?? 100_000,
      }),
      catalogRepository.listStages(organizationId),
    ]);
    const stageById = new Map(stages.map((stage) => [stage.id, stage]));

    return classifyImportDuplicates({
      rows: rows.map((row, index) => ({
        rowNumber: index + 1,
        name: mappedCell(row, nameHeader),
        phone: mappedCell(row, phoneHeader),
        email: mappedCell(row, emailHeader),
      })),
      existingLeads: existingLeads.map((lead) => {
        const stage = stageById.get(lead.currentStageId);
        return {
          id: lead.id,
          customerId: lead.customerId,
          fullNameSnapshot: lead.fullNameSnapshot,
          phoneSnapshot: lead.phoneSnapshot,
          emailSnapshot: lead.emailSnapshot,
          currentStageId: lead.currentStageId,
          currentStageName: stage?.name ?? "Unassigned status",
          stageBucket: stage?.bucket ?? "ACTIVE",
          stageSortOrder: stage?.sortOrder ?? 0,
          updatedAt: lead.updatedAt,
        };
      }),
      matchMode,
      stages,
    });
  };
}
