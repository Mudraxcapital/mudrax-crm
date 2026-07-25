import { describe, expect, it } from "vitest";
import {
  buildUnknownColumnSuggestions,
  detectFieldTypeFromSamples,
} from "../application/services/detectImportFieldType";

describe("detectImportFieldType", () => {
  it("detects email, phone, number, and currency", () => {
    expect(detectFieldTypeFromSamples(["a@b.com", "c@d.org"])).toBe("EMAIL");
    expect(detectFieldTypeFromSamples(["9876543210", "+91 98765 43210"])).toBe("PHONE");
    expect(detectFieldTypeFromSamples(["100", "250.5", "3"])).toBe("NUMBER");
    expect(detectFieldTypeFromSamples(["₹25000", "$1,200.00"])).toBe("CURRENCY");
  });

  it("builds create suggestions for unused headers", () => {
    const suggestions = buildUnknownColumnSuggestions({
      unusedHeaders: ["PAN Number", "Monthly Salary"],
      rows: [
        { "PAN Number": "ABCDE1234F", "Monthly Salary": "45000" },
        { "PAN Number": "XYZAB9876C", "Monthly Salary": "52000" },
      ],
    });
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.suggestedName).toBe("PAN Number");
    expect(suggestions[0]?.create).toBe(true);
    expect(suggestions[1]?.fieldType).toBe("NUMBER");
  });
});
