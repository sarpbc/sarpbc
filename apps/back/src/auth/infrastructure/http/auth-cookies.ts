import type { CookieSerializeOptions } from "@fastify/cookie";
import type { FastifyReply } from "fastify";
import type { AuthTokenPair } from "../../application/ports/authentication";
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "../jwt-token.gateway";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export interface AuthCookieConfig {
  secure: boolean;
  domain: string | undefined;
}

function cookieOptions(
  config: AuthCookieConfig | undefined,
  maxAge?: number,
): CookieSerializeOptions {
  const options: CookieSerializeOptions = {
    httpOnly: true,
    secure: Boolean(config?.secure),
    sameSite: "lax",
    path: "/",
  };

  if (config?.domain) {
    options.domain = config.domain;
  }

  if (maxAge !== undefined) {
    options.maxAge = maxAge;
  }

  return options;
}

export function setAuthCookies(
  reply: FastifyReply,
  tokens: AuthTokenPair,
  config: AuthCookieConfig | undefined,
): void {
  reply.setCookie(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    cookieOptions(config, ACCESS_TOKEN_TTL_SECONDS),
  );
  reply.setCookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    cookieOptions(config, REFRESH_TOKEN_TTL_SECONDS),
  );
}

export function clearAuthCookies(reply: FastifyReply, config: AuthCookieConfig | undefined): void {
  const options = cookieOptions(config);
  reply.clearCookie(ACCESS_TOKEN_COOKIE, options);
  reply.clearCookie(REFRESH_TOKEN_COOKIE, options);
}
