import { loadEnv } from "./env.validation";
import type { Env } from "./env.validation";

const DEV_ORIGINS = ["http://localhost:4000", "http://localhost:4001", "http://localhost:4002"];

const sharedParentDomain = (urls: string[]) => {
  const reversed = urls.map((url) => new URL(url).hostname.split(".").toReversed());
  const shared: string[] = [];

  for (
    let i = 0;
    reversed.every((labels) => labels[i] !== undefined && labels[i] === reversed[0][i]);
    i += 1
  ) {
    shared.push(reversed[0][i]);
  }

  return shared.length >= 2 ? `.${shared.toReversed().join(".")}` : undefined;
};

const originWithWww = (url: string) => {
  const origin = new URL(url);

  if (origin.hostname.startsWith("www.")) {
    return [origin.origin];
  }

  const www = new URL(origin.origin);
  www.hostname = `www.${origin.hostname}`;

  return [origin.origin, www.origin];
};

export const toConfiguration = (env: Env) => ({
  admin_url: env.ADMIN_URL,
  authCookie: {
    domain: env.production ? sharedParentDomain([env.FRONT_URL, env.ADMIN_URL]) : undefined,
    secure: env.production,
  },
  ballchasing: {
    apiKey: env.BALLCHASING_API_KEY,
  },
  cloudflare_account_hash: env.CLOUDFLARE_ACCOUNT_HASH,
  cloudflare_account_id: env.CLOUDFLARE_ACCOUNT_ID,
  cloudflare_api_token: env.CLOUDFLARE_API_TOKEN,
  corsOrigins: [
    ...new Set([
      ...(env.production ? originWithWww(env.FRONT_URL) : [new URL(env.FRONT_URL).origin]),
      new URL(env.ADMIN_URL).origin,
      ...(env.production ? [] : DEV_ORIGINS),
    ]),
  ],
  front_url: env.FRONT_URL,
  google_client_id: env.GOOGLE_CLIENT_ID,
  google_client_secret: env.GOOGLE_CLIENT_SECRET,
  google_redirect_uri: env.GOOGLE_REDIRECT_URI,
  indexnow: {
    key: env.INDEXNOW_KEY ?? "",
  },
  internalApiToken: env.INTERNAL_API_TOKEN,
  jwt_token: env.JWT_KEY,
  pandascore_api_token: env.PANDASCORE_API_TOKEN,
  pandascore_sync_on_boot: env.PANDASCORE_SYNC_ON_BOOT === "true",
  port: env.PORT,
  posthog: {
    host: env.POSTHOG_HOST,
    token: env.POSTHOG_PROJECT_TOKEN,
  },
  production: env.production,
  r2_access_key_id: env.R2_ACCESS_KEY_ID,
  r2_account_id: env.R2_ACCOUNT_ID ?? env.CLOUDFLARE_ACCOUNT_ID,
  r2_bucket: env.R2_BUCKET,
  r2_endpoint: env.R2_ENDPOINT,
  r2_public_base_url: env.R2_PUBLIC_BASE_URL,
  r2_secret_access_key: env.R2_SECRET_ACCESS_KEY,
  redis: {
    host: env.REDIS_HOST,
    password: env.REDIS_PASSWORD,
    port: env.REDIS_PORT,
  },
  twitch: {
    clientId: env.TWITCH_CLIENT_ID,
    clientSecret: env.TWITCH_CLIENT_SECRET,
  },
});

export default function loadConfiguration() {
  return toConfiguration(loadEnv());
}
