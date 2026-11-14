import { describe, expect, it } from "vitest";
import { toConfiguration } from "./configuration";
import { validateEnv } from "./env.validation";

const requiredEnv = {
  DB_PASSWORD: "db",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_REDIRECT_URI: "https://api.sarpbc.org/auth/google/callback",
  JWT_KEY: "jwt",
  PANDASCORE_API_TOKEN: "panda",
};

const configure = (env: Record<string, string>) =>
  toConfiguration(validateEnv({ ...requiredEnv, ...env }));

describe(toConfiguration, () => {
  it("derives production origins and the cookie domain from the front and admin URLs", () => {
    const config = configure({
      ADMIN_URL: "https://admin.sarpbc.org",
      FRONT_URL: "https://sarpbc.org",
      NODE_ENV: "production",
    });

    expect(config.corsOrigins).toStrictEqual([
      "https://sarpbc.org",
      "https://www.sarpbc.org",
      "https://admin.sarpbc.org",
    ]);
    expect(config.authCookie).toStrictEqual({ domain: ".sarpbc.org", secure: true });
  });

  it("adds localhost origins and host-only cookies outside production", () => {
    const config = configure({
      ADMIN_URL: "http://localhost:4002",
      FRONT_URL: "http://localhost:4000",
    });

    expect(config.corsOrigins).toStrictEqual([
      "http://localhost:4000",
      "http://localhost:4002",
      "http://localhost:4001",
    ]);
    expect(config.authCookie).toStrictEqual({ domain: undefined, secure: false });
  });
});
