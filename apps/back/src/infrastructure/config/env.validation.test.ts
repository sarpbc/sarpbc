import { describe, expect, it } from "vitest";
import { validateEnv } from "./env.validation";

describe("validateEnv", () => {
  it("applies defaults for optional services", () => {
    const env = validateEnv({});
    expect(env.PORT).toBe(4001);
    expect(env.REDIS_HOST).toBe("redis");
    expect(env.REDIS_PORT).toBe(6379);
  });

  it("rejects an invalid PORT", () => {
    expect(() => validateEnv({ PORT: "nope" })).toThrow(/Invalid environment/);
  });

  it("accepts an absent or empty IndexNow key without enabling submissions", () => {
    expect(validateEnv({}).INDEXNOW_KEY).toBeUndefined();
    expect(validateEnv({ INDEXNOW_KEY: "" }).INDEXNOW_KEY).toBe("");
  });

  it("rejects malformed IndexNow credentials without including their value in the error", () => {
    const invalid = "invalid/indexnow/credential";
    expect(() => validateEnv({ INDEXNOW_KEY: invalid })).toThrow(/INDEXNOW_KEY/);
    try {
      validateEnv({ INDEXNOW_KEY: invalid });
    } catch (error) {
      expect(String(error)).not.toContain(invalid);
    }
  });
});
