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

  it("maps Customer Name to Lead Name and includes dynamic fields", () => {
    const mapping = suggestColumnMapping(
      ["Customer Name", "Phone Number", "E-mail", "PAN Number"],
      [{ key: "pan_number", label: "PAN Number" }],
    );
    expect(mapping.full_name).toBe("Customer Name");
    expect(mapping.phone).toBe("Phone Number");
    expect(mapping.email).toBe("E-mail");
    expect(mapping.pan_number).toBe("PAN Number");
  });
});
