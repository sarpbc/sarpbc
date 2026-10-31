import { z } from "zod";
import { INDEXNOW_KEY_PATTERN } from "@sarpbc/utils";

const optionalSecret = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4001),
  REDIS_HOST: z.string().min(1).default("redis"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  POSTHOG_PROJECT_TOKEN: z.string().optional(),
  POSTHOG_HOST: z.string().optional(),
  INDEXNOW_KEY: z.union([z.literal(""), z.string().regex(INDEXNOW_KEY_PATTERN)]).optional(),
  TWITCH_CLIENT_ID: optionalSecret,
  TWITCH_CLIENT_SECRET: optionalSecret,
  INTERNAL_API_TOKEN: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim() ?? "";
      return trimmed.length === 0 ? undefined : trimmed;
    })
    .refine((value) => value === undefined || /^[\x21-\x7E]{16,}$/.test(value), {
      message: "must be at least 16 visible ASCII characters",
    }),
});

export interface ProcessEnv {
  NODE_ENV?: string;
  PORT?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  POSTHOG_PROJECT_TOKEN?: string;
  POSTHOG_HOST?: string;
  INDEXNOW_KEY?: string;
  INTERNAL_API_TOKEN?: string;
  TWITCH_CLIENT_ID?: string;
  TWITCH_CLIENT_SECRET?: string;
}

export function validateEnv(config: ProcessEnv) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${message}`);
  }

  return {
    ...config,
    ...parsed.data,
  };
}
