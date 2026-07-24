import { describe, expect, it } from "vitest";
import { fuzzyScore, rankByFuzzy } from "../fuzzy";

describe("fuzzy search", () => {
  it("scores exact-ish substrings highly", () => {
    expect(fuzzyScore("rahul", "Rahul Sharma")).toBeGreaterThan(0.8);
  });

  it("ranks candidates by score", () => {
    const ranked = rankByFuzzy(
      "loan",
      [{ name: "Home Loan" }, { name: "Deposit" }, { name: "Personal Loan" }],
      (item) => item.name,
      0.2,
    );
    expect(ranked[0]?.item.name).toMatch(/Loan/);
  });
});
