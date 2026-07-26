import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "../application/validators/safeCallbackUrl";

describe("safeCallbackUrl", () => {
  it("allows root-relative app paths", () => {
    expect(safeCallbackUrl("/leads")).toBe("/leads");
    expect(safeCallbackUrl("/leads?q=1")).toBe("/leads?q=1");
    expect(safeCallbackUrl("/")).toBe("/");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/");
    expect(safeCallbackUrl("http://evil.com/path")).toBe("/");
    expect(safeCallbackUrl("//evil.com")).toBe("/");
    expect(safeCallbackUrl("//evil.com/path")).toBe("/");
  });

  it("rejects scheme handlers", () => {
    expect(safeCallbackUrl("javascript:alert(1)")).toBe("/");
    expect(safeCallbackUrl("data:text/html,hi")).toBe("/");
  });

  it("falls back for auth entry points and empty values", () => {
    expect(safeCallbackUrl("/login")).toBe("/");
    expect(safeCallbackUrl("/login?x=1")).toBe("/");
    expect(safeCallbackUrl("/session-expired")).toBe("/");
    expect(safeCallbackUrl("/clear-session")).toBe("/");
    expect(safeCallbackUrl("")).toBe("/");
    expect(safeCallbackUrl(undefined)).toBe("/");
    expect(safeCallbackUrl(null)).toBe("/");
  });

  it("honors a custom fallback", () => {
    expect(safeCallbackUrl("//evil.com", "/crm")).toBe("/crm");
  });
});
