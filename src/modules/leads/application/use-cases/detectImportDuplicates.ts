// ============================================================================
// src/modules/leads/application/use-cases/detectImportDuplicates.ts
//
// Classifies import rows as New / Possible Duplicate / Exact Duplicate
// against existing Leads using configurable match fields.
// ============================================================================

export type DuplicateMatchMode = "phone" | "email" | "phone_name" | "phone_or_email";

export type DuplicateCategory = "new" | "possible" | "exact";

export type DuplicateResolutionMode =
  | "import_all"
  | "skip_duplicates"
  | "merge"
  | "update_existing";

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
}

export interface DuplicateClassification {
  rowNumber: number;
  category: DuplicateCategory;
  matchReason: string | null;
  existingLeadId: string | null;
  existingCustomerId: string | null;
  name: string;
  phone: string;
  email: string;
}

export interface DuplicateDetectionSummary {
  newLeads: DuplicateClassification[];
  possibleDuplicates: DuplicateClassification[];
  exactDuplicates: DuplicateClassification[];
}

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

export function classifyImportDuplicates(input: {
  rows: ImportRowCandidate[];
  existingLeads: ExistingLeadCandidate[];
  matchMode: DuplicateMatchMode;
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

  for (const row of input.rows) {
    const phone = normalizePhone(row.phone);
    const email = normalizeEmail(row.email);
    const name = normalizeName(row.name);

    const phoneHits = phone ? (byPhone.get(phone) ?? []) : [];
    const emailHits = email ? (byEmail.get(email) ?? []) : [];

    let category: DuplicateCategory = "new";
    let matchReason: string | null = null;
    let match: ExistingLeadCandidate | null = null;

    switch (input.matchMode) {
      case "phone": {
        if (phoneHits[0]) {
          category = "exact";
          matchReason = "Phone";
          match = phoneHits[0];
        }
        break;
      }
      case "email": {
        if (emailHits[0]) {
          category = "exact";
          matchReason = "Email";
          match = emailHits[0];
        }
        break;
      }
      case "phone_or_email": {
        if (phoneHits[0]) {
          category = "exact";
          matchReason = "Phone";
          match = phoneHits[0];
        } else if (emailHits[0]) {
          category = "exact";
          matchReason = "Email";
          match = emailHits[0];
        }
        break;
      }
      case "phone_name": {
        if (phoneHits[0] && namesSimilar(name, normalizeName(phoneHits[0].fullNameSnapshot))) {
          category = "exact";
          matchReason = "Phone + Name";
          match = phoneHits[0];
        } else if (phoneHits[0]) {
          category = "possible";
          matchReason = "Phone (name differs)";
          match = phoneHits[0];
        } else if (emailHits[0]) {
          category = "possible";
          matchReason = "Email";
          match = emailHits[0];
        }
        break;
      }
      default: {
        const _exhaustive: never = input.matchMode;
        return _exhaustive;
      }
    }

    const entry: DuplicateClassification = {
      rowNumber: row.rowNumber,
      category,
      matchReason,
      existingLeadId: match?.id ?? null,
      existingCustomerId: match?.customerId ?? null,
      name: row.name,
      phone: row.phone,
      email: row.email,
    };

    if (category === "exact") exactDuplicates.push(entry);
    else if (category === "possible") possibleDuplicates.push(entry);
    else newLeads.push(entry);
  }

  return { newLeads, possibleDuplicates, exactDuplicates };
}

export function buildDuplicateReportCsv(summary: DuplicateDetectionSummary): string {
  const lines = ["rowNumber,category,name,phone,email,matchReason,existingLeadId"];
  const all = [...summary.newLeads, ...summary.possibleDuplicates, ...summary.exactDuplicates];
  for (const row of all) {
    const cells = [
      String(row.rowNumber),
      row.category,
      csvEscape(row.name),
      csvEscape(row.phone),
      csvEscape(row.email),
      csvEscape(row.matchReason ?? ""),
      row.existingLeadId ?? "",
    ];
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
