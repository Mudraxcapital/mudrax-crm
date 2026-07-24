import { describe, expect, it } from "vitest";
import { parseCsv, renderCsv } from "../csv";

describe("csv helpers", () => {
  it("round-trips simple rows", () => {
    const body = renderCsv(["fullName", "phone"], [{ fullName: "A", phone: "1" }]);
    const parsed = parseCsv(body);
    expect(parsed.headers).toEqual(["fullName", "phone"]);
    expect(parsed.rows[0]?.fullName).toBe("A");
  });

  it("handles quoted commas", () => {
    const parsed = parseCsv('name,note\n"Sharma, Rahul","hello, world"\n');
    expect(parsed.rows[0]?.name).toBe("Sharma, Rahul");
    expect(parsed.rows[0]?.note).toBe("hello, world");
  });
});
