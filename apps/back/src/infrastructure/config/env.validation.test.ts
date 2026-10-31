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

  it("treats a blank internal API token as unset", () => {
    expect(validateEnv({}).INTERNAL_API_TOKEN).toBeUndefined();
    expect(validateEnv({ INTERNAL_API_TOKEN: "" }).INTERNAL_API_TOKEN).toBeUndefined();
    expect(validateEnv({ INTERNAL_API_TOKEN: "   " }).INTERNAL_API_TOKEN).toBeUndefined();
  });

  it("treats absent or blank Twitch credentials as unset", () => {
    const absent = validateEnv({});
    expect(absent.TWITCH_CLIENT_ID).toBeUndefined();
    expect(absent.TWITCH_CLIENT_SECRET).toBeUndefined();
    const blank = validateEnv({ TWITCH_CLIENT_ID: "", TWITCH_CLIENT_SECRET: "  " });
    expect(blank.TWITCH_CLIENT_ID).toBeUndefined();
    expect(blank.TWITCH_CLIENT_SECRET).toBeUndefined();
  });

  it("accepts a long internal API token", () => {
    expect(validateEnv({ INTERNAL_API_TOKEN: "internal-api-token-value" }).INTERNAL_API_TOKEN).toBe(
      "internal-api-token-value",
    );
  });

  it("rejects a short internal API token without including its value in the error", () => {
    const invalid = "short-token";
    expect(() => validateEnv({ INTERNAL_API_TOKEN: invalid })).toThrow(/INTERNAL_API_TOKEN/);
    try {
      validateEnv({ INTERNAL_API_TOKEN: invalid });
    } catch (error) {
      expect(String(error)).not.toContain(invalid);
    }
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
