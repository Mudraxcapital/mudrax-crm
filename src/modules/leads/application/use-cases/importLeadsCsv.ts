// ============================================================================
// src/modules/leads/application/use-cases/importLeadsCsv.ts
//
// CSV bulk Lead intake → Import Batch → Import Rows → Lead creation
// (leads.md Import Batch workflow, simplified single-pass commit).
// ============================================================================

import { parseCsv } from "@/shared/csv/csv";
import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { ImportBatchRepository } from "../../domain/repositories/ImportBatchRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import type { CustomerLookupPort } from "../ports/CustomerLookupPort";
import {
  ImportBatchNotFoundError,
  InvalidLeadSourceReferenceError,
  InvalidLeadStageReferenceError,
} from "../../domain/errors/LeadErrors";
import type { ImportLeadsCsvInput } from "../validators/productivitySchemas";
import { toImportBatchDto, type ImportBatchDto } from "../dto/ImportBatchDto";

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const direct = row[key];
    if (direct?.trim()) return direct.trim();
    const found = Object.entries(row).find(([k]) => k.toLowerCase() === key.toLowerCase());
    if (found?.[1]?.trim()) return found[1].trim();
  }
  return "";
}

export function makeImportLeadsCsv(
  importRepository: ImportBatchRepository,
  leadRepository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  customerLookup: CustomerLookupPort,
) {
  return async function importLeadsCsv(command: {
    organizationId: string;
    input: ImportLeadsCsvInput;
    actor: LeadAuditActor;
  }): Promise<ImportBatchDto> {
    const { organizationId, input, actor } = command;

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

    const batch = await importRepository.create({
      organizationId,
      uploadedByUserId: actor.actorId ?? organizationId,
      leadSourceId: input.leadSourceId,
      campaignId: input.campaignId ?? null,
      sourceFileName: input.sourceFileName,
    });

    const { rows } = parseCsv(input.csvText);
    const now = new Date();
    let createdRowCount = 0;
    let duplicateRowCount = 0;

    const importRows = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]!;
      const fullName = cell(row, "fullName", "name", "full_name");
      const phone = cell(row, "phone", "phoneSnapshot", "mobile");
      const email = cell(row, "email", "emailSnapshot");
      const customerId = cell(row, "customerId", "customer_id");

      if (!fullName) {
        importRows.push({
          importBatchId: batch.id,
          rowNumber: index + 1,
          rawData: row,
          parseStatus: "INVALID" as const,
          parseErrors: ["fullName is required"],
        });
        continue;
      }

      try {
        let customer = customerId ? await customerLookup.findById(customerId) : null;
        if (customerId && (!customer || customer.organizationId !== organizationId)) {
          importRows.push({
            importBatchId: batch.id,
            rowNumber: index + 1,
            rawData: row,
            parseStatus: "INVALID" as const,
            parseErrors: [`Customer ${customerId} was not found`],
          });
          continue;
        }

        if (!customer) {
          customer = await customerLookup.resolveOrCreate({
            organizationId,
            fullName,
            phone: phone || null,
            email: email || null,
            actorUserId: actor.actorId ?? organizationId,
          });
        }

        const existingLeads = await leadRepository.listByCustomer(customer.id);
        if (existingLeads.length > 0) duplicateRowCount += 1;

        await leadRepository.createWithAudit(
          {
            organizationId,
            customerId: customer.id,
            leadSourceId: input.leadSourceId,
            currentStageId: defaultStage.id,
            campaignId: input.campaignId ?? null,
            fullNameSnapshot: fullName,
            phoneSnapshot: phone || null,
            emailSnapshot: email || null,
          },
          actor,
        );
        createdRowCount += 1;

        importRows.push({
          importBatchId: batch.id,
          rowNumber: index + 1,
          rawData: row,
          parseStatus: "PARSED" as const,
          parseErrors: null,
          resolvedCustomerId: customer.id,
        });
      } catch (error) {
        importRows.push({
          importBatchId: batch.id,
          rowNumber: index + 1,
          rawData: row,
          parseStatus: "INVALID" as const,
          parseErrors: [error instanceof Error ? error.message : "Import row failed"],
        });
      }
    }

    await importRepository.createRows(importRows);
    const updated = await importRepository.updateCounts(batch.id, {
      status: "COMPLETED",
      totalRowCount: rows.length,
      createdRowCount,
      duplicateRowCount,
      parsedAt: now,
      committedAt: now,
      completedAt: now,
    });

    return toImportBatchDto(updated);
  };
}

export function makeListImportBatches(importRepository: ImportBatchRepository) {
  return async function listImportBatches(
    organizationId: string,
  ): Promise<ImportBatchDto[]> {
    const batches = await importRepository.list(organizationId);
    return batches.map(toImportBatchDto);
  };
}

export function makeGetImportBatch(importRepository: ImportBatchRepository) {
  return async function getImportBatch(id: string): Promise<ImportBatchDto> {
    const batch = await importRepository.findById(id);
    if (!batch) throw new ImportBatchNotFoundError(id);
    return toImportBatchDto(batch);
  };
}
