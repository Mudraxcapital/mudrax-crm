// ============================================================================
// Infer CRM Lead Field types from Excel sample values (import mapping).
// ============================================================================

import {
  slugifyInternalKey,
  type LeadFieldType,
} from "../../domain/entities/LeadFieldDefinition";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;
const BOOL_RE = /^(true|false|yes|no|y|n|1|0|on|off)$/i;
const CURRENCY_RE = /^[$₹€£]?\s*-?[\d,]+(\.\d{1,4})?$/;
const NUMBER_RE = /^-?[\d,]+(\.\d+)?%?$/;
const DATE_RE =
  /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})$/;
const DATETIME_RE = /\d{1,2}:\d{2}(:\d{2})?(\s?(AM|PM))?/i;

export interface UnknownColumnSuggestion {
  excelHeader: string;
  suggestedName: string;
  suggestedInternalKey: string;
  fieldType: LeadFieldType;
  sampleValue: string;
  create: boolean;
  selectOptions?: string[];
}

function nonEmptySamples(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function detectFieldTypeFromSamples(samples: string[]): LeadFieldType {
  const values = nonEmptySamples(samples);
  if (values.length === 0) return "TEXT";

  const ratio = (predicate: (value: string) => boolean) =>
    values.filter(predicate).length / values.length;

  if (ratio((value) => EMAIL_RE.test(value)) >= 0.8) return "EMAIL";
  if (ratio((value) => PHONE_RE.test(value) && value.replace(/\D/g, "").length >= 7) >= 0.8) {
    return "PHONE";
  }
  if (ratio((value) => BOOL_RE.test(value)) >= 0.85) return "BOOLEAN";
  if (ratio((value) => DATETIME_RE.test(value) && !Number.isNaN(Date.parse(value))) >= 0.7) {
    return "DATE_TIME";
  }
  if (ratio((value) => DATE_RE.test(value) && !Number.isNaN(Date.parse(value))) >= 0.7) {
    return "DATE";
  }
  if (ratio((value) => CURRENCY_RE.test(value) && /[$₹€£]/.test(value)) >= 0.6) {
    return "CURRENCY";
  }
  if (
    ratio(
      (value) =>
        NUMBER_RE.test(value) && Number.isFinite(Number(value.replace(/[,%]/g, ""))),
    ) >= 0.8
  ) {
    return "NUMBER";
  }

  const unique = new Set(values.map((value) => value.toLowerCase()));
  if (
    values.length >= 8 &&
    unique.size > 1 &&
    unique.size <= 12 &&
    unique.size / values.length <= 0.4
  ) {
    return "DROPDOWN";
  }

  return "TEXT";
}

export function suggestNameFromHeader(header: string): string {
  return header
    .trim()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .slice(0, 100);
}

/** Build review rows for Excel headers that are not mapped to any CRM field. */
export function buildUnknownColumnSuggestions(input: {
  unusedHeaders: string[];
  rows: Record<string, string>[];
}): UnknownColumnSuggestion[] {
  return input.unusedHeaders.map((header) => {
    const samples = input.rows.map((row) => row[header] ?? "");
    const fieldType = detectFieldTypeFromSamples(samples);
    const suggestedName = suggestNameFromHeader(header);
    const values = nonEmptySamples(samples);
    const selectOptions =
      fieldType === "DROPDOWN"
        ? [...new Set(values)].slice(0, 50)
        : undefined;
    return {
      excelHeader: header,
      suggestedName,
      suggestedInternalKey: slugifyInternalKey(suggestedName),
      fieldType,
      sampleValue: values[0] ?? "",
      create: true,
      selectOptions,
    };
  });
}
