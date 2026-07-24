// ============================================================================
// src/modules/reports/application/export/csvExporter.ts
// ============================================================================

import type { ReportResult } from "../ports/SourceDataPort";

function escapeCsvCell(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function renderCsv(result: ReportResult): string {
  const header = result.columns.map(escapeCsvCell).join(",");
  const lines = result.rows.map((row) =>
    result.columns.map((column) => escapeCsvCell(row[column] ?? null)).join(","),
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}
