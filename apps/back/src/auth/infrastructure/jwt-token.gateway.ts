import type { JwtService } from "@nestjs/jwt";
import { z } from "zod";
import type { AuthenticatedUser } from "../../common/application/models/authenticated-user";
import type {
  AuthTokenPair,
  AuthTokenType,
  SessionTokens,
} from "../application/ports/authentication";

export const ACCESS_TOKEN_TTL_SECONDS = 2 * 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const payloadSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  typ: z.enum(["access", "refresh"]),
});

type JwtSigner = Pick<JwtService, "signAsync" | "verifyAsync">;

export class JwtTokenGateway implements SessionTokens {
  constructor(
    private readonly jwt: JwtSigner,
    private readonly secret: string,
  ) {}

  async sign(user: AuthenticatedUser): Promise<AuthTokenPair> {
    const { secret } = this;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { id: user.id, email: user.email, typ: "access" },
        { secret, expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      ),
      this.jwt.signAsync(
        { id: user.id, email: user.email, typ: "refresh" },
        { secret, expiresIn: REFRESH_TOKEN_TTL_SECONDS },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async verify(token: string, type: AuthTokenType): Promise<AuthenticatedUser | null> {
    try {
      const parsed = payloadSchema.safeParse(
        await this.jwt.verifyAsync<object>(token, { secret: this.secret }),
      );

      return parsed.success && parsed.data.typ === type
        ? { id: parsed.data.id, email: parsed.data.email }
        : null;
    } catch {
      return null;
    }
  }
}
