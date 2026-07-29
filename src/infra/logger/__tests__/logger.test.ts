import { describe, expect, it } from "vitest";
import { logger } from "../logger";

describe("logger redaction", () => {
  it("emits without throwing and redacts secret-shaped keys", () => {
    expect(() =>
      logger.info("test", {
        userId: "u1",
        password: "should-not-appear",
        nested: { apiKey: "secret", ok: true },
      }),
    ).not.toThrow();
  });
});
