import { describe, expect, it } from "vitest";
import {
  assertSafeSpreadsheetUpload,
  sanitizeSpreadsheetCell,
  SpreadsheetUploadError,
} from "../uploadSecurity";
import { parseSpreadsheet } from "../parseSpreadsheet";

describe("spreadsheet upload security", () => {
  it("rejects oversized uploads", () => {
    expect(() =>
      assertSafeSpreadsheetUpload({
        fileName: "leads.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: 20 * 1024 * 1024,
      }),
    ).toThrow(SpreadsheetUploadError);
  });

  it("rejects disallowed extensions", () => {
    expect(() =>
      assertSafeSpreadsheetUpload({
        fileName: "payload.exe",
        mimeType: "application/octet-stream",
        sizeBytes: 100,
      }),
    ).toThrow(/Unsupported file type/i);
  });

  it("neutralizes formula injection cells", () => {
    expect(sanitizeSpreadsheetCell("=CMD()")).toBe("'=CMD()");
    expect(sanitizeSpreadsheetCell("+1-555")).toBe("'+1-555");
  });

  it("parses a small CSV safely", () => {
    const table = parseSpreadsheet({
      fileName: "leads.csv",
      mimeType: "text/csv",
      csvText: "Name,Phone\nAlice,999\n=HYPERLINK(x),111\n",
    });
    expect(table.headers).toEqual(["Name", "Phone"]);
    expect(table.rows[1]?.Name).toBe("'=HYPERLINK(x)");
  });
});
