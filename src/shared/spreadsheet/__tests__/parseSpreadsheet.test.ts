import { describe, expect, it } from "vitest";
import {
  parseSpreadsheet,
  suggestColumnMapping,
} from "../parseSpreadsheet";

describe("parseSpreadsheet", () => {
  it("parses CSV content", () => {
    const table = parseSpreadsheet({
      fileName: "leads.csv",
      csvText: "Name,Phone,Email\nRahul,+919876543210,rahul@example.com\n",
    });
    expect(table.format).toBe("csv");
    expect(table.headers).toEqual(["Name", "Phone", "Email"]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]?.Name).toBe("Rahul");
  });

  it("suggests column mapping from common headers", () => {
    const mapping = suggestColumnMapping([
      "Full Name",
      "Mobile",
      "Email Address",
      "City",
      "Notes",
    ]);
    expect(mapping.full_name).toBe("Full Name");
    expect(mapping.phone).toBe("Mobile");
    expect(mapping.email).toBe("Email Address");
    expect(mapping.city).toBe("City");
    expect(mapping.notes).toBe("Notes");
  });

  it("maps Lead ID column to phone (unique contact key)", () => {
    const mapping = suggestColumnMapping(["Name", "Lead ID", "City"]);
    expect(mapping.full_name).toBe("Name");
    expect(mapping.phone).toBe("Lead ID");
  });
});
