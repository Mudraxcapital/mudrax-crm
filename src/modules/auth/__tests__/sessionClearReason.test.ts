import { describe, expect, it } from "vitest";
import {
  accountStatusToClearReason,
  isSessionClearReason,
  loginRedirectForClearReason,
} from "../domain/sessionClearReason";

describe("sessionClearReason", () => {
  it("parses allowed reasons only", () => {
    expect(isSessionClearReason("disabled")).toBe(true);
    expect(isSessionClearReason("suspended")).toBe(true);
    expect(isSessionClearReason("session_revoked")).toBe(true);
    expect(isSessionClearReason("unauthenticated")).toBe(false);
    expect(isSessionClearReason(null)).toBe(false);
  });

  it("maps account status for login banners", () => {
    expect(accountStatusToClearReason("SUSPENDED")).toBe("suspended");
    expect(accountStatusToClearReason("INACTIVE")).toBe("disabled");
    expect(accountStatusToClearReason("ACTIVE")).toBe("disabled");
  });

  it("builds login redirect targets", () => {
    expect(loginRedirectForClearReason("disabled")).toBe("/login?reason=disabled");
    expect(loginRedirectForClearReason(null)).toBe("/login");
  });
});
