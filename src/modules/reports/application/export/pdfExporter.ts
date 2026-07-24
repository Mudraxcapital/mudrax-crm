// ============================================================================
// src/modules/reports/application/export/pdfExporter.ts
// ============================================================================

import type { ReportResult } from "../ports/SourceDataPort";

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function renderPdf(result: ReportResult): string {
  const lines: string[] = [
    `Mudrax CRM — ${result.reportType} Report`,
    `Generated: ${result.generatedAt}`,
    "",
    result.columns.join(" | "),
    "-".repeat(Math.min(90, Math.max(20, result.columns.join(" | ").length))),
  ];

  for (const row of result.rows.slice(0, 80)) {
    lines.push(result.columns.map((column) => String(row[column] ?? "")).join(" | "));
  }

  if (result.rows.length > 80) {
    lines.push(`... ${result.rows.length - 80} more row(s)`);
  }

  const contentLines = lines
    .map((line, index) => {
      const y = 800 - index * 14;
      return `BT /F1 10 Tf 40 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join("\n");

  const stream = `${contentLines}\n`;
  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj",
  );
  objects.push(
    `4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}endstream\nendobj`,
  );
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}
