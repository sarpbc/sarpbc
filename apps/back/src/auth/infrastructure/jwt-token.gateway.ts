import type { JwtService } from "@nestjs/jwt";
import { z } from "zod";
import type { AuthenticatedUser } from "../../common/application/models/authenticated-user";
import type { AuthTokenType, SessionTokens } from "../application/ports/authentication";

export const ACCESS_TOKEN_TTL_SECONDS = 2 * 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const payloadSchema = z.object({
  email: z.string(),
  id: z.string().min(1),
  typ: z.enum(["access", "refresh"]),
});

type JwtSigner = Pick<JwtService, "signAsync" | "verifyAsync">;

export class JwtTokenGateway implements SessionTokens {
  constructor(
    private readonly jwt: JwtSigner,
    private readonly secret: string,
  ) {}

  async sign(user: AuthenticatedUser) {
    const { secret } = this;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { email: user.email, id: user.id, typ: "access" },
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS, secret },
      ),
      this.jwt.signAsync(
        { email: user.email, id: user.id, typ: "refresh" },
        { expiresIn: REFRESH_TOKEN_TTL_SECONDS, secret },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async verify(token: string, type: AuthTokenType) {
    try {
      const parsed = payloadSchema.safeParse(
        await this.jwt.verifyAsync<object>(token, { secret: this.secret }),
      );

      return parsed.success && parsed.data.typ === type
        ? { email: parsed.data.email, id: parsed.data.id }
        : null;
    } catch {
      return null;
    }
  }
}
