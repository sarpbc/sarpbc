import { describe, expect, it } from "vitest";
import { readSecret, validateEnv as validate } from "./env.validation";

const requiredEnv = {
  DB_PASSWORD: "db",
  JWT_KEY: "jwt",
  PANDASCORE_API_TOKEN: "panda",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_REDIRECT_URI: "http://localhost:4001/auth/google/callback",
  FRONT_URL: "http://localhost:4000",
  ADMIN_URL: "http://localhost:4002",
};

const validateEnv = (overrides: Record<string, string | undefined> = {}) =>
  validate({ ...requiredEnv, ...overrides });

describe("validateEnv", () => {
  it("applies defaults for optional services", () => {
    const env = validateEnv();
    expect(env.PORT).toBe(4001);
    expect(env.REDIS_HOST).toBe("redis");
    expect(env.REDIS_PORT).toBe(6379);
  });

  it("applies the shared defaults", () => {
    const env = validateEnv();
    expect(env.POSTHOG_HOST).toBe("https://eu.i.posthog.com");
    expect(env.R2_BUCKET).toBe("sarpbc-org");
    expect(env.DB_PORT).toBe(5433);
    expect(env.production).toBe(false);
  });

  it("fails when a required secret is missing", () => {
    expect(() => validate({ ...requiredEnv, JWT_KEY: undefined })).toThrow(/JWT_KEY/);
  });

  it("reads an absent secret file as missing", () => {
    expect(readSecret({}, "JWT_KEY", "sarpbc_missing_secret")).toBeUndefined();
    expect(readSecret({ JWT_KEY: "value" }, "JWT_KEY", "sarpbc_missing_secret")).toBe("value");
  });

  it("rejects an invalid PORT", () => {
    expect(() => validateEnv({ PORT: "nope" })).toThrow(/Invalid environment/);
  });

  it("accepts an absent or empty IndexNow key without enabling submissions", () => {
    expect(validateEnv().INDEXNOW_KEY).toBeUndefined();
    expect(validateEnv({ INDEXNOW_KEY: "" }).INDEXNOW_KEY).toBe("");
  });

  it("treats a blank internal API token as unset", () => {
    expect(validateEnv().INTERNAL_API_TOKEN).toBeUndefined();
    expect(validateEnv({ INTERNAL_API_TOKEN: "" }).INTERNAL_API_TOKEN).toBeUndefined();
    expect(validateEnv({ INTERNAL_API_TOKEN: "   " }).INTERNAL_API_TOKEN).toBeUndefined();
  });

  it("treats absent or blank Twitch credentials as unset", () => {
    const absent = validateEnv();
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
