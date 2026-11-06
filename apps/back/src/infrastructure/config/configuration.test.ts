import { describe, expect, it } from "vitest";
import { toConfiguration } from "./configuration";
import { validateEnv } from "./env.validation";

const requiredEnv = {
  DB_PASSWORD: "db",
  JWT_KEY: "jwt",
  PANDASCORE_API_TOKEN: "panda",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_REDIRECT_URI: "https://api.sarpbc.org/auth/google/callback",
};

function configure(env: Record<string, string>) {
  return toConfiguration(validateEnv({ ...requiredEnv, ...env }));
}

describe("toConfiguration", () => {
  it("derives production origins and the cookie domain from the front and admin URLs", () => {
    const config = configure({
      NODE_ENV: "production",
      FRONT_URL: "https://sarpbc.org",
      ADMIN_URL: "https://admin.sarpbc.org",
    });

    expect(config.corsOrigins).toEqual([
      "https://sarpbc.org",
      "https://www.sarpbc.org",
      "https://admin.sarpbc.org",
    ]);
    expect(config.authCookie).toEqual({ secure: true, domain: ".sarpbc.org" });
  });

  it("adds localhost origins and host-only cookies outside production", () => {
    const config = configure({
      FRONT_URL: "http://localhost:4000",
      ADMIN_URL: "http://localhost:4002",
    });

    expect(config.corsOrigins).toEqual([
      "http://localhost:4000",
      "http://localhost:4002",
      "http://localhost:4001",
    ]);
    expect(config.authCookie).toEqual({ secure: false, domain: undefined });
  });
});
