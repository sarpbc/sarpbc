export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const ACCESS_TOKEN_TTL_SECONDS = 2 * 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export const ACCESS_TOKEN_EXPIRES_IN = "2h";
export const REFRESH_TOKEN_EXPIRES_IN = "30d";

export type AuthTokenType = "access" | "refresh";

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

function baseCookieOptions(production: boolean | undefined): Record<string, unknown> {
  const cookieOptions: Record<string, unknown> = {
    httpOnly: true,
    secure: Boolean(production),
    sameSite: "lax",
    path: "/",
  };

  if (production) {
    cookieOptions.domain = ".sarpbc.org";
  }

  return cookieOptions;
}

export function authCookieOptions(
  production: boolean | undefined,
  maxAgeSeconds: number | false,
): Record<string, unknown> {
  const cookieOptions = baseCookieOptions(production);
  if (maxAgeSeconds !== false) {
    cookieOptions.maxAge = maxAgeSeconds;
  }
  return cookieOptions;
}

export function accessTokenCookieOptions(
  production: boolean | undefined,
  includeMaxAge = true,
): Record<string, unknown> {
  return authCookieOptions(production, includeMaxAge ? ACCESS_TOKEN_TTL_SECONDS : false);
}

export function refreshTokenCookieOptions(
  production: boolean | undefined,
  includeMaxAge = true,
): Record<string, unknown> {
  return authCookieOptions(production, includeMaxAge ? REFRESH_TOKEN_TTL_SECONDS : false);
}
