import type { CookieSerializeOptions } from "@fastify/cookie";
import type { JwtService } from "@nestjs/jwt";
import type { FastifyReply } from "fastify";
import type { UserToken } from "src/common/types/usertoken.interface";

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

export interface SignedTokenPayload extends UserToken {
  typ: AuthTokenType;
}

type JwtSigner = Pick<JwtService, "signAsync" | "verifyAsync">;

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

export async function signAuthTokenPair(
  jwtService: JwtSigner,
  secret: string,
  user: UserToken,
): Promise<AuthTokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    jwtService.signAsync(
      { id: user.id, email: user.email, typ: "access" satisfies AuthTokenType },
      { secret, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    ),
    jwtService.signAsync(
      { id: user.id, email: user.email, typ: "refresh" satisfies AuthTokenType },
      { secret, expiresIn: REFRESH_TOKEN_EXPIRES_IN },
    ),
  ]);

  return { accessToken, refreshToken };
}

export async function verifyAuthToken(
  jwtService: JwtSigner,
  secret: string,
  token: string,
  typ: AuthTokenType,
): Promise<UserToken | null> {
  try {
    const payload = await jwtService.verifyAsync<SignedTokenPayload>(token, { secret });
    if (payload.typ !== typ || !payload.id) {
      return null;
    }
    return { id: payload.id, email: payload.email };
  } catch {
    return null;
  }
}
