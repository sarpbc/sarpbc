import type { CookieSerializeOptions } from "@fastify/cookie";
import type { FastifyReply } from "fastify";
import type { AuthTokenPair } from "../../application/ports/authentication";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const ACCESS_TOKEN_TTL_SECONDS = 2 * 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function cookieOptions(production: boolean | undefined, maxAge?: number): CookieSerializeOptions {
  const options: CookieSerializeOptions = {
    httpOnly: true,
    secure: Boolean(production),
    sameSite: "lax",
    path: "/",
  };

  if (production) {
    options.domain = ".sarpbc.org";
  }
  if (maxAge !== undefined) {
    options.maxAge = maxAge;
  }

  return options;
}

export function setAuthCookies(
  reply: FastifyReply,
  tokens: AuthTokenPair,
  production: boolean | undefined,
): void {
  reply.setCookie(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    cookieOptions(production, ACCESS_TOKEN_TTL_SECONDS),
  );
  reply.setCookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    cookieOptions(production, REFRESH_TOKEN_TTL_SECONDS),
  );
}

export function clearAuthCookies(reply: FastifyReply, production: boolean | undefined): void {
  const options = cookieOptions(production);
  reply.clearCookie(ACCESS_TOKEN_COOKIE, options);
  reply.clearCookie(REFRESH_TOKEN_COOKIE, options);
}
