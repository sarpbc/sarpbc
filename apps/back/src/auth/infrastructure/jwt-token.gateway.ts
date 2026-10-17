import type { JwtService } from "@nestjs/jwt";
import { z } from "zod";
import type { UserToken } from "../../common/application/models/user-token";
import type {
  AuthTokenPair,
  AuthTokenType,
  SessionTokens,
} from "../application/ports/authentication";

export const ACCESS_TOKEN_EXPIRES_IN = "2h";
export const REFRESH_TOKEN_EXPIRES_IN = "30d";

const payloadSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  typ: z.enum(["access", "refresh"]),
});
type JwtSigner = Pick<JwtService, "signAsync" | "verifyAsync">;

export async function signAuthTokenPair(
  jwtService: JwtSigner,
  secret: string,
  user: UserToken,
): Promise<AuthTokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    jwtService.signAsync(
      { id: user.id, email: user.email, typ: "access" },
      { secret, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    ),
    jwtService.signAsync(
      { id: user.id, email: user.email, typ: "refresh" },
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
    const parsed = payloadSchema.safeParse(await jwtService.verifyAsync<object>(token, { secret }));
    return parsed.success && parsed.data.typ === typ
      ? { id: parsed.data.id, email: parsed.data.email }
      : null;
  } catch {
    return null;
  }
}

export class JwtTokenGateway implements SessionTokens {
  constructor(
    private readonly jwt: JwtSigner,
    private readonly secret: string,
  ) {}
  sign(user: UserToken): Promise<AuthTokenPair> {
    return signAuthTokenPair(this.jwt, this.secret, user);
  }
  verify(token: string, type: AuthTokenType): Promise<UserToken | null> {
    return verifyAuthToken(this.jwt, this.secret, token, type);
  }
}
