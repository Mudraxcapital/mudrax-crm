// ============================================================================
// Shared spreadsheet parsing for bulk Lead import (.csv / .xlsx / .xls).
// ============================================================================

import * as XLSX from "xlsx";
import { parseCsv } from "@/shared/csv/csv";

export type SpreadsheetFormat = "csv" | "xlsx" | "xls";

export interface SpreadsheetTable {
  headers: string[];
  rows: Record<string, string>[];
  format: SpreadsheetFormat;
  sheetName?: string;
  sheetNames?: string[];
}

function normalizeCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function sheetToTable(sheet: XLSX.WorkSheet): { headers: string[]; rows: Record<string, string>[] } {
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (matrix.length === 0) return { headers: [], rows: [] };

  const headerRow = matrix[0] ?? [];
  const headers = headerRow.map((cell, index) => {
    const label = normalizeCell(cell);
    return label.length > 0 ? label : `Column ${index + 1}`;
  });

  const rows = matrix.slice(1).map((line) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = normalizeCell(line?.[index]);
    });
    return row;
  });

  const nonEmpty = rows.filter((row) => Object.values(row).some((value) => value.length > 0));
  return { headers, rows: nonEmpty };
}

export function detectSpreadsheetFormat(fileName: string, mimeType?: string | null): SpreadsheetFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || mimeType?.includes("spreadsheetml")) return "xlsx";
  if (lower.endsWith(".xls") || mimeType === "application/vnd.ms-excel") return "xls";
  return "csv";
}

/** List worksheet names for Excel workbooks (empty for CSV). */
export function listSpreadsheetSheets(input: {
  fileName: string;
  mimeType?: string | null;
  binary?: ArrayBuffer | Uint8Array | null;
}): string[] {
  const format = detectSpreadsheetFormat(input.fileName, input.mimeType);
  if (format === "csv" || !input.binary) return [];
  const workbook = XLSX.read(input.binary, { type: "array", bookSheets: true, bookProps: true });
  return workbook.SheetNames ?? [];
}

/** Parse CSV text or Excel binary into a normalized header/row table. */
export function parseSpreadsheet(input: {
  fileName: string;
  mimeType?: string | null;
  csvText?: string | null;
  binary?: ArrayBuffer | Uint8Array | null;
  /** Worksheet name when the workbook has multiple sheets. */
  sheetName?: string | null;
}): SpreadsheetTable {
  const format = detectSpreadsheetFormat(input.fileName, input.mimeType);

  if (format === "csv") {
    const text = input.csvText ?? "";
    const parsed = parseCsv(text);
    return { headers: parsed.headers, rows: parsed.rows, format, sheetNames: [] };
  }

  if (!input.binary) {
    throw new Error("Excel file content is required for .xlsx / .xls imports.");
  }

  const workbook = XLSX.read(input.binary, { type: "array", cellDates: true });
  const sheetNames = workbook.SheetNames ?? [];
  const selected =
    (input.sheetName && sheetNames.includes(input.sheetName) ? input.sheetName : null) ??
    sheetNames[0];
  if (!selected) {
    return { headers: [], rows: [], format, sheetNames };
  }
  const sheet = workbook.Sheets[selected];
  if (!sheet) {
    return { headers: [], rows: [], format, sheetName: selected, sheetNames };
  }
  const table = sheetToTable(sheet);
  return { ...table, format, sheetName: selected, sheetNames };
}

/** Operational import keys that are not Lead Field Definitions. */
export const LEAD_IMPORT_OPERATIONAL_FIELDS = [
  "city",
  "state",
  "source",
  "campaign",
  "assignedAgent",
  "notes",
] as const;

export type LeadImportOperationalField = (typeof LEAD_IMPORT_OPERATIONAL_FIELDS)[number];

/** @deprecated Prefer dynamic field keys from Field Settings + operational fields. */
export const LEAD_IMPORT_FIELDS = [
  "full_name",
  "name",
  "phone",
  "email",
  ...LEAD_IMPORT_OPERATIONAL_FIELDS,
] as const;

export type LeadImportField = string;

export const LEAD_IMPORT_OPERATIONAL_LABELS: Record<LeadImportOperationalField, string> = {
  city: "City",
  state: "State",
  source: "Source",
  campaign: "Campaign",
  assignedAgent: "Assigned Agent",
  notes: "Notes",
};

/** @deprecated Prefer labels from Field Settings. */
export const LEAD_IMPORT_FIELD_LABELS: Record<string, string> = {
  full_name: "Lead Name",
  name: "Lead Name",
  phone: "Phone",
  email: "Email",
  ...LEAD_IMPORT_OPERATIONAL_LABELS,
};

const OPERATIONAL_ALIASES: Record<LeadImportOperationalField, string[]> = {
  city: ["city", "town"],
  state: ["state", "province", "region"],
  source: ["source", "lead source", "leadsource"],
  campaign: ["campaign", "campaign name"],
  assignedAgent: [
    "assigned agent",
    "agent",
    "assignee",
    "assigned to",
    "owner",
    "assigned agent email",
  ],
  notes: ["notes", "note", "comments", "remark", "remarks"],
};

const SYSTEM_ALIASES: Record<string, string[]> = {
  full_name: [
    "name",
    "full name",
    "fullname",
    "contact name",
    "customer name",
    "lead name",
    "client name",
    "full_name",
  ],
  phone: [
    "phone",
    "mobile",
    "mobile number",
    "phone number",
    "contact number",
    "cell",
    "cellphone",
    // Many Mudrax sheets use Lead ID as the phone / unique contact key.
    "lead id",
    "leadid",
    "lead_id",
    "leadid / phone",
  ],
  email: ["email", "email address", "e-mail", "mail"],
};

export interface ImportFieldOption {
  key: string;
  label: string;
  required?: boolean;
}

/** Suggest a mapping from spreadsheet headers to dynamic + operational import fields. */
export function suggestColumnMapping(
  headers: string[],
  fieldOptions?: ImportFieldOption[],
): Partial<Record<string, string>> {
  const mapping: Partial<Record<string, string>> = {};
  const used = new Set<string>();

  const systemTargets = Object.entries(SYSTEM_ALIASES).map(([key, aliases]) => ({
    key,
    aliases,
  }));
  const optionTargets = (fieldOptions ?? []).map((field) => ({
    key: field.key,
    aliases: [
      field.key,
      field.label,
      field.label.toLowerCase(),
      field.key.replace(/_/g, " "),
      ...(SYSTEM_ALIASES[field.key] ?? []),
    ],
  }));
  const operationalTargets = LEAD_IMPORT_OPERATIONAL_FIELDS.map((key) => ({
    key,
    aliases: OPERATIONAL_ALIASES[key],
  }));

  // System aliases first so phone/email map even when fieldOptions is omitted.
  const targets: Array<{ key: string; aliases: string[] }> = [
    ...systemTargets,
    ...optionTargets.filter((target) => !SYSTEM_ALIASES[target.key]),
    ...operationalTargets,
  ];

  for (const target of targets) {
    const aliases = [...target.aliases].sort((a, b) => b.length - a.length);
    const match = headers.find((header) => {
      if (used.has(header)) return false;
      const normalized = header.trim().toLowerCase();
      return aliases.some((alias) => alias.trim().toLowerCase() === normalized);
    });
    if (match) {
      mapping[target.key] = match;
      used.add(match);
    }
  }

  for (const target of targets) {
    if (mapping[target.key]) continue;
    const aliases = [...target.aliases].sort((a, b) => b.length - a.length);
    const match = headers.find((header) => {
      if (used.has(header)) return false;
      const normalized = header.trim().toLowerCase();
      return aliases.some((alias) => alias.length >= 4 && normalized.includes(alias.toLowerCase()));
    });
    if (match) {
      mapping[target.key] = match;
      used.add(match);
    }
  }

  return mapping;
}

/** Headers that are not mapped to any CRM field (ignored on import). */
export function unusedHeaders(
  headers: string[],
  mapping: Partial<Record<string, string>>,
): string[] {
  const used = new Set(Object.values(mapping).filter(Boolean) as string[]);
  return headers.filter((header) => !used.has(header));
}
