import { readFileSync } from "node:fs";
import { z } from "zod";
import { INDEXNOW_KEY_PATTERN } from "@sarpbc/utils";
import { nonBlank } from "../../common/domain/text";

type RawEnv = Record<string, string | undefined>;

const blankAsUndefined = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const optionalText = z
  .string()
  .optional()
  .transform((value) => nonBlank(value));

const urlSchema = z.url();

const nodeEnvSchema = z.enum(["development", "production", "test"]).default("development");

const databaseSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  DB_NAME: blankAsUndefined(z.string().default("sarpbc")),
  DB_USER: blankAsUndefined(z.string().default("sarpbc")),
  DB_HOST: blankAsUndefined(z.string().default("localhost")),
  DB_PORT: blankAsUndefined(z.coerce.number().int().positive().default(5433)),
  DB_PASSWORD: z.string(),
});

const envSchema = databaseSchema.extend({
  PORT: z.coerce.number().int().positive().default(4001),
  REDIS_HOST: z.string().min(1).default("redis"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: blankAsUndefined(z.string().optional()),
  POSTHOG_PROJECT_TOKEN: z.string().optional(),
  POSTHOG_HOST: blankAsUndefined(z.string().default("https://eu.i.posthog.com")),
  INDEXNOW_KEY: z.union([z.literal(""), z.string().regex(INDEXNOW_KEY_PATTERN)]).optional(),
  TWITCH_CLIENT_ID: optionalText,
  TWITCH_CLIENT_SECRET: optionalText,
  BALLCHASING_API_KEY: optionalText,
  INTERNAL_API_TOKEN: optionalText.refine(
    (value) => value === undefined || /^[\u0021-\u007E]{16,}$/.test(value),
    { message: "must be at least 16 visible ASCII characters" },
  ),
  PANDASCORE_SYNC_ON_BOOT: z.string().optional(),
  FRONT_URL: urlSchema,
  ADMIN_URL: urlSchema,
  JWT_KEY: z.string(),
  PANDASCORE_API_TOKEN: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  CLOUDFLARE_ACCOUNT_ID: blankAsUndefined(z.string().optional()),
  CLOUDFLARE_API_TOKEN: blankAsUndefined(z.string().optional()),
  CLOUDFLARE_ACCOUNT_HASH: blankAsUndefined(z.string().optional()),
  R2_ACCOUNT_ID: blankAsUndefined(z.string().optional()),
  R2_ACCESS_KEY_ID: blankAsUndefined(z.string().optional()),
  R2_SECRET_ACCESS_KEY: blankAsUndefined(z.string().optional()),
  R2_BUCKET: blankAsUndefined(z.string().default("sarpbc-org")),
  R2_ENDPOINT: blankAsUndefined(z.string().optional()),
  R2_PUBLIC_BASE_URL: blankAsUndefined(z.string().optional()),
});

const SECRET_FILES = {
  DB_PASSWORD: "sarpbc_db_password",
  JWT_KEY: "sarpbc_jwt_key",
  PANDASCORE_API_TOKEN: "sarpbc_pandascore_token",
  GOOGLE_CLIENT_SECRET: "sarpbc_google_secret",
  GOOGLE_CLIENT_ID: "sarpbc_google_id",
  CLOUDFLARE_ACCOUNT_ID: "sarpbc_cloudflare_account_id",
  CLOUDFLARE_API_TOKEN: "sarpbc_cloudflare_api_token",
  CLOUDFLARE_ACCOUNT_HASH: "sarpbc_cloudflare_account_hash",
  R2_ACCESS_KEY_ID: "sarpbc_r2_access_key_id",
  R2_SECRET_ACCESS_KEY: "sarpbc_r2_secret_access_key",
} as const;

export function readSecret(env: RawEnv, name: string, file: string): string | undefined {
  const value = env[name];

  if (value !== undefined) {
    return value;
  }

  try {
    return readFileSync(`/run/secrets/${file}`, "utf-8").trim();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function withSecrets(env: RawEnv, files: Readonly<Record<string, string>>) {
  const secrets = Object.fromEntries(
    Object.entries(files).map(([name, file]): [string, string | undefined] => [
      name,
      readSecret(env, name, file),
    ]),
  );

  return { ...env, ...secrets };
}

function parse<T extends z.ZodType>(schema: T, env: RawEnv): z.infer<T> {
  const parsed = schema.safeParse(env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment: ${message}`);
  }

  return parsed.data;
}

function withProduction<T extends { NODE_ENV: string }>(data: T) {
  return { ...data, production: data.NODE_ENV === "production" };
}

export function validateEnv(env: RawEnv) {
  return withProduction(parse(envSchema, withSecrets(env, SECRET_FILES)));
}

export function validateDatabaseEnv(env: RawEnv) {
  return withProduction(
    parse(databaseSchema, withSecrets(env, { DB_PASSWORD: SECRET_FILES.DB_PASSWORD })),
  );
}

export function loadEnv() {
  return validateEnv(process.env);
}

export function loadDatabaseEnv() {
  return validateDatabaseEnv(process.env);
}

export function nodeEnvironment(): z.infer<typeof nodeEnvSchema> {
  return nodeEnvSchema.parse(process.env.NODE_ENV);
}

export function frontUrl(): string {
  return urlSchema.parse(process.env.FRONT_URL);
}

export function adminUrl(): string {
  return urlSchema.parse(process.env.ADMIN_URL);
}

export type Env = ReturnType<typeof validateEnv>;
