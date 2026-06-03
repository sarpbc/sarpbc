import { readFileSync } from "fs";

export function getDatabasePassword(): string {
  if (process.env.DB_PASSWORD !== undefined) {
    return process.env.DB_PASSWORD;
  }

  try {
    const secret = readFileSync("/run/secrets/sarpbc_db_password", "utf8");
    return secret.trim();
  } catch {
    throw new Error("Database password not found");
  }
}

export function getJwtToken(): string {
  if (process.env.JWT_KEY !== undefined) {
    return process.env.JWT_KEY;
  }

  try {
    const secret = readFileSync("/run/secrets/sarpbc_jwt_key", "utf8");
    return secret.trim();
  } catch {
    throw new Error("JWT key not found");
  }
}

export function getPandaScoreApiToken(): string {
  if (process.env.PANDASCORE_API_TOKEN !== undefined) {
    return process.env.PANDASCORE_API_TOKEN;
  }

  try {
    const secret = readFileSync("/run/secrets/sarpbc_pandascore_token", "utf8");
    return secret.trim();
  } catch {
    throw new Error("PandaScore API token not found");
  }
}

export function getGoogleClientSecret(): string {
  if (process.env.GOOGLE_CLIENT_SECRET !== undefined) {
    return process.env.GOOGLE_CLIENT_SECRET;
  }

  try {
    const secret = readFileSync("/run/secrets/sarpbc_google_secret", "utf8");
    return secret.trim();
  } catch {
    throw new Error("Google Client Secret not found");
  }
}

export function getGoogleClientId(): string {
  if (process.env.GOOGLE_CLIENT_ID !== undefined) {
    return process.env.GOOGLE_CLIENT_ID;
  }

  try {
    const secret = readFileSync("/run/secrets/sarpbc_google_id", "utf8");
    return secret.trim();
  } catch {
    throw new Error("Google Client Id not found");
  }
}

export function getGoogleRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI !== undefined) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  throw new Error("Google Redirect URI not found");
}

export function getFrontUrl(): string {
  if (process.env.FRONT_URL !== undefined) {
    return process.env.FRONT_URL;
  }
  throw new Error("Front URL not found");
}

export function getCloudflareAccountId(): string {
  if (process.env.CLOUDFLARE_ACCOUNT_ID !== undefined) {
    return process.env.CLOUDFLARE_ACCOUNT_ID;
  }

  try {
    const secret = readFileSync("/run/secrets/sarpbc_cloudflare_account_id", "utf8");
    return secret.trim();
  } catch {
    throw new Error("Cloudflare Account Id not found");
  }
}

export function getCloudflareApiToken(): string {
  if (process.env.CLOUDFLARE_API_TOKEN !== undefined) {
    return process.env.CLOUDFLARE_API_TOKEN;
  }

  try {
    const secret = readFileSync("/run/secrets/sarpbc_cloudflare_api_token", "utf8");
    return secret.trim();
  } catch {
    throw new Error("Cloudflare API Token not found");
  }
}

export function getCloudflareAccountHash(): string {
  if (process.env.CLOUDFLARE_ACCOUNT_HASH !== undefined) {
    return process.env.CLOUDFLARE_ACCOUNT_HASH;
  }

  try {
    const secret = readFileSync("/run/secrets/sarpbc_cloudflare_account_hash", "utf8");
    return secret.trim();
  } catch {
    throw new Error("Cloudflare Account Hash not found");
  }
}
