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
});
