// ============================================================================
// src/modules/leads/application/use-cases/detectImportDuplicates.ts
//
// Classifies import rows as New / Possible Duplicate / Exact Duplicate
// against existing Leads using configurable match fields, then groups
// duplicates by current CRM Lead Stage (never hardcoded statuses).
// ============================================================================

export type DuplicateMatchMode = "phone" | "email" | "phone_name" | "phone_or_email";

export type DuplicateCategory = "new" | "possible" | "exact";

/** Where the duplicate was found: CRM/campaign DB vs another row in the same Excel file. */
export type DuplicateOrigin = "crm" | "file";

/** Synthetic status-group id for within-file duplicates (not a CRM Lead Stage). */
export const IN_FILE_DUPLICATE_STAGE_ID = "__in_file__";

/**
 * Import strategies for duplicate rows.
 * - skip_duplicates: import only new leads (recommended)
 * - import_all: create another lead for every duplicate
 * - replace_selected_statuses: remove old leads in selected stages (same campaign), re-import those rows only as Fresh
 * - archive_and_reimport: close/archive old leads in selected stages (history kept), then create new
 * - merge / update_existing: legacy update paths
 */
export type DuplicateResolutionMode =
  | "import_all"
  | "skip_duplicates"
  | "merge"
  | "update_existing"
  | "replace_selected_statuses"
  | "archive_and_reimport";

export interface ImportRowCandidate {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
}

export interface ExistingLeadCandidate {
  id: string;
  customerId: string;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  emailSnapshot: string | null;
  currentStageId: string;
  currentStageName: string;
  /** INITIAL | ACTIVE | CLOSED — from CRM Lead Stage metadata. */
  stageBucket: string;
  stageSortOrder: number;
  updatedAt: Date;
}

export interface DuplicateClassification {
  rowNumber: number;
  category: DuplicateCategory;
  /** crm = matches a lead already in CRM/campaign; file = repeat row inside this Excel. */
  origin: DuplicateOrigin | null;
  matchReason: string | null;
  existingLeadId: string | null;
  existingCustomerId: string | null;
  existingStageId: string | null;
  existingStageName: string | null;
  existingUpdatedAt: string | null;
  name: string;
  phone: string;
  email: string;
}

export interface DuplicateStatusGroup {
  stageId: string;
  stageName: string;
  sortOrder: number;
  count: number;
  latestUpdatedAt: string | null;
  duplicates: DuplicateClassification[];
}

export interface DuplicateDetectionSummary {
  matchMode: DuplicateMatchMode;
  matchLabel: string;
  totalRows: number;
  /** Rows that already exist in CRM / campaign DB (not Excel-only repeats). */
  alreadyExisting: number;
  /** Rows that repeat an earlier phone/email inside the same Excel file. */
  inFileDuplicateCount: number;
  newLeadCount: number;
  newLeads: DuplicateClassification[];
  possibleDuplicates: DuplicateClassification[];
  exactDuplicates: DuplicateClassification[];
  /** CRM duplicates only. */
  crmDuplicates: DuplicateClassification[];
  /** Within-file duplicates only. */
  inFileDuplicates: DuplicateClassification[];
  /** All duplicate rows (CRM + file), for downloads. */
  allDuplicates: DuplicateClassification[];
  /**
   * CRM Lead Stage groups (includes zero-count stages), plus a trailing
   * "Duplicate in Excel" group when the file has internal repeats.
   */
  statusGroups: DuplicateStatusGroup[];
}

export const DUPLICATE_MATCH_LABELS: Record<DuplicateMatchMode, string> = {
  phone: "Phone Number",
  email: "Email",
  phone_name: "Phone + Name",
  phone_or_email: "Phone or Email",
};

function normalizePhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D+/g, "");
  // Prefer last 10 digits for IN mobile comparisons (+91XXXXXXXXXX vs XXXXXXXXXX).
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function namesSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

/** Prefer open pipeline leads over closed ones when several share an identifier. */
function pickBestMatch(hits: ExistingLeadCandidate[]): ExistingLeadCandidate | null {
  if (hits.length === 0) return null;
  const open = hits.find((lead) => lead.stageBucket !== "CLOSED");
  return open ?? hits[0] ?? null;
}

export function classifyImportDuplicates(input: {
  rows: ImportRowCandidate[];
  existingLeads: ExistingLeadCandidate[];
  matchMode: DuplicateMatchMode;
  /** Active CRM stages — used to emit a complete dynamic status list (including zeros). */
  stages?: Array<{ id: string; name: string; sortOrder: number; isActive: boolean }>;
}): DuplicateDetectionSummary {
  const byPhone = new Map<string, ExistingLeadCandidate[]>();
  const byEmail = new Map<string, ExistingLeadCandidate[]>();

  for (const lead of input.existingLeads) {
    const phone = normalizePhone(lead.phoneSnapshot);
    const email = normalizeEmail(lead.emailSnapshot);
    if (phone) {
      const list = byPhone.get(phone) ?? [];
      list.push(lead);
      byPhone.set(phone, list);
    }
    if (email) {
      const list = byEmail.get(email) ?? [];
      list.push(lead);
      byEmail.set(email, list);
    }
  }

  const newLeads: DuplicateClassification[] = [];
  const possibleDuplicates: DuplicateClassification[] = [];
  const exactDuplicates: DuplicateClassification[] = [];
  // Phone is the Lead identity — keep the first row in this file, skip the rest.
  const seenPhonesInFile = new Set<string>();
  const seenEmailsInFile = new Set<string>();

  for (const row of input.rows) {
    const phone = normalizePhone(row.phone);
    const email = normalizeEmail(row.email);
    const name = normalizeName(row.name);

    const phoneHits = phone ? (byPhone.get(phone) ?? []) : [];
    const emailHits = email ? (byEmail.get(email) ?? []) : [];
    const phoneMatch = pickBestMatch(phoneHits);
    const emailMatch = pickBestMatch(emailHits);

    let category: DuplicateCategory = "new";
    let matchReason: string | null = null;
    let match: ExistingLeadCandidate | null = null;

    switch (input.matchMode) {
      case "phone": {
        if (phoneMatch) {
          category = "exact";
          matchReason = "Phone";
          match = phoneMatch;
        }
        break;
      }
      case "email": {
        if (emailMatch) {
          category = "exact";
          matchReason = "Email";
          match = emailMatch;
        }
        break;
      }
      case "phone_or_email": {
        if (phoneMatch) {
          category = "exact";
          matchReason = "Phone";
          match = phoneMatch;
        } else if (emailMatch) {
          category = "exact";
          matchReason = "Email";
          match = emailMatch;
        }
        break;
      }
      case "phone_name": {
        if (phoneMatch && namesSimilar(name, normalizeName(phoneMatch.fullNameSnapshot))) {
          category = "exact";
          matchReason = "Phone + Name";
          match = phoneMatch;
        } else if (phoneMatch) {
          category = "possible";
          matchReason = "Phone (name differs)";
          match = phoneMatch;
        } else if (emailMatch) {
          category = "possible";
          matchReason = "Email";
          match = emailMatch;
        }
        break;
      }
      default: {
        const _exhaustive: never = input.matchMode;
        return _exhaustive;
      }
    }

    // Within-file duplicates: first occurrence wins; later rows are ignored on skip.
    // These are NOT "already existing" in CRM — they only collide inside this Excel.
    let origin: DuplicateOrigin | null = category === "new" ? null : "crm";
    if (category === "new") {
      const phoneKeyUsed =
        input.matchMode === "phone" ||
        input.matchMode === "phone_or_email" ||
        input.matchMode === "phone_name";
      const emailKeyUsed =
        input.matchMode === "email" || input.matchMode === "phone_or_email";

      if (phoneKeyUsed && phone && seenPhonesInFile.has(phone)) {
        category = "exact";
        matchReason = "Phone (duplicate in file)";
        origin = "file";
        match = null;
      } else if (emailKeyUsed && email && seenEmailsInFile.has(email)) {
        category = "exact";
        matchReason = "Email (duplicate in file)";
        origin = "file";
        match = null;
      }
    }

    if (phone) seenPhonesInFile.add(phone);
    if (email) seenEmailsInFile.add(email);

    const entry: DuplicateClassification = {
      rowNumber: row.rowNumber,
      category,
      origin,
      matchReason,
      existingLeadId: match?.id ?? null,
      existingCustomerId: match?.customerId ?? null,
      existingStageId: match?.currentStageId ?? null,
      existingStageName: match?.currentStageName ?? null,
      existingUpdatedAt: match?.updatedAt.toISOString() ?? null,
      name: row.name,
      phone: row.phone,
      email: row.email,
    };

    if (category === "exact") exactDuplicates.push(entry);
    else if (category === "possible") possibleDuplicates.push(entry);
    else newLeads.push(entry);
  }

  const allDuplicates = [...exactDuplicates, ...possibleDuplicates];
  const crmDuplicates = allDuplicates.filter((row) => row.origin === "crm");
  const inFileDuplicates = allDuplicates.filter((row) => row.origin === "file");
  const statusGroups = groupDuplicatesByStage(crmDuplicates, inFileDuplicates, input.stages ?? []);

  return {
    matchMode: input.matchMode,
    matchLabel: DUPLICATE_MATCH_LABELS[input.matchMode],
    totalRows: input.rows.length,
    alreadyExisting: crmDuplicates.length,
    inFileDuplicateCount: inFileDuplicates.length,
    newLeadCount: newLeads.length,
    newLeads,
    possibleDuplicates,
    exactDuplicates,
    crmDuplicates,
    inFileDuplicates,
    allDuplicates,
    statusGroups,
  };
}

export function groupDuplicatesByStage(
  crmDuplicates: DuplicateClassification[],
  inFileDuplicates: DuplicateClassification[],
  stages: Array<{ id: string; name: string; sortOrder: number; isActive: boolean }>,
): DuplicateStatusGroup[] {
  const activeStages = stages
    .filter(
      (stage) => stage.isActive && !/^integration\s*test/i.test(stage.name.trim()),
    )
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const byStage = new Map<string, DuplicateClassification[]>();

  for (const row of crmDuplicates) {
    // CRM matches always carry a stage id; fall back to name-keyed bucket if missing.
    const stageId = row.existingStageId ?? `__missing__:${row.existingStageName ?? "unassigned"}`;
    const list = byStage.get(stageId) ?? [];
    list.push(row);
    byStage.set(stageId, list);
  }

  const groups: DuplicateStatusGroup[] = activeStages.map((stage) => {
    const rows = byStage.get(stage.id) ?? [];
    return {
      stageId: stage.id,
      stageName: stage.name,
      sortOrder: stage.sortOrder,
      count: rows.length,
      latestUpdatedAt: latestIso(rows.map((row) => row.existingUpdatedAt)),
      duplicates: rows,
    };
  });

  // Include stages that appear on CRM duplicates but are inactive / missing from catalog.
  for (const [stageId, rows] of byStage) {
    if (groups.some((group) => group.stageId === stageId)) continue;
    const named =
      rows[0]?.existingStageName?.trim() ||
      (stageId.startsWith("__missing__:") ? stageId.slice("__missing__:".length) : "");
    // Hide leftover Integration Test catalog rows from the import status picker.
    if (/^integration\s*test/i.test(named)) continue;
    groups.push({
      stageId,
      stageName: named && named.toLowerCase() !== "unknown" ? named : "Unassigned status",
      sortOrder: Number.MAX_SAFE_INTEGER - 1,
      count: rows.length,
      latestUpdatedAt: latestIso(rows.map((row) => row.existingUpdatedAt)),
      duplicates: rows,
    });
  }

  // Within-file duplicates are never "Unknown" CRM status — show them explicitly.
  if (inFileDuplicates.length > 0) {
    groups.push({
      stageId: IN_FILE_DUPLICATE_STAGE_ID,
      stageName: "Duplicate in Excel",
      sortOrder: Number.MAX_SAFE_INTEGER,
      count: inFileDuplicates.length,
      latestUpdatedAt: null,
      duplicates: inFileDuplicates,
    });
  }

  return groups.sort((a, b) => a.sortOrder - b.sortOrder || a.stageName.localeCompare(b.stageName));
}

function latestIso(values: Array<string | null>): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (!value) continue;
    if (!latest || value > latest) latest = value;
  }
  return latest;
}

export function buildDuplicateReportCsv(
  summary: DuplicateDetectionSummary,
  options?: { category?: DuplicateCategory | "duplicate"; stageId?: string },
): string {
  const lines = [
    "rowNumber,category,name,phone,email,matchReason,existingLeadId,existingStage,existingUpdatedAt",
  ];
  let rows: DuplicateClassification[];
  if (options?.stageId) {
    rows = summary.statusGroups.find((group) => group.stageId === options.stageId)?.duplicates ?? [];
  } else if (options?.category === "new") {
    rows = summary.newLeads;
  } else if (options?.category === "duplicate") {
    rows = summary.allDuplicates;
  } else if (options?.category) {
    rows =
      options.category === "exact"
        ? summary.exactDuplicates
        : options.category === "possible"
          ? summary.possibleDuplicates
          : summary.newLeads;
  } else {
    rows = [...summary.newLeads, ...summary.allDuplicates];
  }

  for (const row of rows) {
    const cells = [
      String(row.rowNumber),
      row.category,
      csvEscape(row.name),
      csvEscape(row.phone),
      csvEscape(row.email),
      csvEscape(row.matchReason ?? ""),
      row.existingLeadId ?? "",
      csvEscape(row.existingStageName ?? ""),
      row.existingUpdatedAt ?? "",
    ];
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

export function buildFailedRowsCsv(
  errors: Array<{ rowNumber: number; message: string; name?: string; phone?: string }>,
): string {
  const lines = ["rowNumber,name,phone,message"];
  for (const row of errors) {
    lines.push(
      [
        String(row.rowNumber),
        csvEscape(row.name ?? ""),
        csvEscape(row.phone ?? ""),
        csvEscape(row.message),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
