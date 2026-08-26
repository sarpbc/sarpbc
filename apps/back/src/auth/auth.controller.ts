import { Body, Controller, Get, Post, Query, Request, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { useLogger } from "evlog/nestjs";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { SignInUserDto } from "src/user/dto/signin-user.dto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ConfigService } from "@nestjs/config";
import { PostHogService } from "src/posthog/posthog.service";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  type AuthTokenPair,
} from "./auth-cookies";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private posthog: PostHogService,
  ) {}

  private production(): boolean | undefined {
    return this.configService.get<boolean>("production");
  }

  private setAuthCookies(res: FastifyReply, tokens: AuthTokenPair) {
    const production = this.production();
    res.setCookie(
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      accessTokenCookieOptions(production, true),
    );
    res.setCookie(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      refreshTokenCookieOptions(production, true),
    );
  }

  private clearAuthCookies(res: FastifyReply) {
    const production = this.production();
    res.clearCookie(ACCESS_TOKEN_COOKIE, accessTokenCookieOptions(production, false));
    res.clearCookie(REFRESH_TOKEN_COOKIE, refreshTokenCookieOptions(production, false));
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  async signIn(
    @Body() userData: SignInUserDto,
    @Res() res: FastifyReply,
    @Request() req: FastifyRequest,
  ) {
    const tokens = await this.authService.signIn(userData);

    this.setAuthCookies(res, tokens);

    const distinctId = req.headers["x-posthog-distinct-id"] as string | undefined;
    const sessionId = req.headers["x-posthog-session-id"] as string | undefined;
    this.posthog.capture({ distinctId, event: "server_user_logged_in", sessionId });
    await this.posthog.flush();

    return res.code(200).send({ success: true });
  }

  @Get("logout")
  logout(@Res() res: FastifyReply) {
    this.clearAuthCookies(res);
    return res.send({ success: true });
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("refresh")
  async refresh(@Request() req: FastifyRequest, @Res() res: FastifyReply) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      this.clearAuthCookies(res);
      return res.code(401).send({
        statusCode: 401,
        message: "Missing auth token in cookie",
      });
    }

    const tokens = await this.authService.refreshSession(refreshToken);
    if (!tokens) {
      this.clearAuthCookies(res);
      return res.code(401).send({
        statusCode: 401,
        message: "Invalid or expired token",
      });
    }

    this.setAuthCookies(res, tokens);
    return res.code(200).send({ success: true });
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("signup")
  async signUp(
    @Body() userData: CreateUserDto,
    @Res() res: FastifyReply,
    @Request() req: FastifyRequest,
  ) {
    const tokens = await this.authService.signUp(userData);

    this.setAuthCookies(res, tokens);

    const distinctId = req.headers["x-posthog-distinct-id"] as string | undefined;
    const sessionId = req.headers["x-posthog-session-id"] as string | undefined;
    this.posthog.capture({ distinctId, event: "server_user_signed_up", sessionId });
    await this.posthog.flush();

    return res.code(200).send({ success: true });
  }

  @UseGuards(AuthGuard)
  @Get("profile")
  getProfile(@Request() req: FastifyRequest & { user?: unknown }) {
    return req.user;
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get("google")
  redirectToGoogle(@Query("returnTo") returnTo: string | undefined, @Res() res: FastifyReply) {
    const destination = this.authService.parseOAuthReturnTo(returnTo);
    const url = this.authService.getGoogleAuthUrl(destination);
    return res.code(302).redirect(url);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get("google/callback")
  async handleGoogleCallback(
    @Query("code") code: string,
    @Query("state") state: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const log = useLogger();
    const returnUrl = this.authService.resolveOAuthReturnUrl(
      this.authService.parseOAuthReturnTo(state),
    );

    try {
      const tokens = await this.authService.handleGoogleCallback(code);

      this.setAuthCookies(res, tokens);

      return res.code(302).redirect(returnUrl);
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      const separator = returnUrl.includes("?") ? "&" : "?";
      return res.code(302).redirect(`${returnUrl}${separator}authError=google`);
    }
  }
}
