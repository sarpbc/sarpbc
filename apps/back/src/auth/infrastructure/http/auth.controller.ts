import { Body, Controller, Get, Post, Query, Request, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { useLogger } from "evlog/nestjs";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "../../application/auth.service";
import { CreateUserDto } from "../../../user/infrastructure/http/dto/create-user.dto";
import { SignInUserDto } from "../../../user/infrastructure/http/dto/signin-user.dto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ConfigService } from "@nestjs/config";
import { AuthenticatedUserRequest } from "../../../common/infrastructure/http/types/authenticated.interface";
import { captureRequestEvent } from "../../../infrastructure/telemetry/capture-request-event";
import { PostHogService } from "../../../infrastructure/telemetry/posthog.service";
import {
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  type AuthCookieConfig,
} from "./auth-cookies";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly posthog: PostHogService,
  ) {}

  private authCookie(): AuthCookieConfig | undefined {
    return this.configService.get<AuthCookieConfig>("authCookie");
  }

  private async captureAuthEvent(
    req: FastifyRequest,
    event: "server_user_logged_in" | "server_user_signed_up",
  ): Promise<void> {
    await captureRequestEvent(this.posthog, req.headers, event);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  async signIn(
    @Body({ schema: SignInUserDto }) userData: SignInUserDto,
    @Res() res: FastifyReply,
    @Request() req: FastifyRequest,
  ) {
    const tokens = await this.authService.signIn(userData);
    setAuthCookies(res, tokens, this.authCookie());
    await this.captureAuthEvent(req, "server_user_logged_in");

    return await res.code(200).send({ success: true });
  }

  @Get("logout")
  logout(@Res() res: FastifyReply) {
    clearAuthCookies(res, this.authCookie());

    return res.send({ success: true });
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("refresh")
  async refresh(@Request() req: FastifyRequest, @Res() res: FastifyReply) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      clearAuthCookies(res, this.authCookie());

      return await res.code(401).send({
        statusCode: 401,
        message: "Missing auth token in cookie",
      });
    }

    const session = await this.authService.refreshSession(refreshToken);

    if (!session) {
      clearAuthCookies(res, this.authCookie());

      return await res.code(401).send({
        statusCode: 401,
        message: "Invalid or expired token",
      });
    }

    setAuthCookies(res, session.tokens, this.authCookie());

    return await res.code(200).send({ success: true });
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("signup")
  async signUp(
    @Body({ schema: CreateUserDto }) userData: CreateUserDto,
    @Res() res: FastifyReply,
    @Request() req: FastifyRequest,
  ) {
    const tokens = await this.authService.signUp(userData);
    setAuthCookies(res, tokens, this.authCookie());
    await this.captureAuthEvent(req, "server_user_signed_up");

    return await res.code(200).send({ success: true });
  }

  @UseGuards(AuthGuard)
  @Get("profile")
  getProfile(@Request() req: AuthenticatedUserRequest) {
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
      setAuthCookies(res, tokens, this.authCookie());

      return await res.code(302).redirect(returnUrl);
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      const separator = returnUrl.includes("?") ? "&" : "?";

      return await res.code(302).redirect(`${returnUrl}${separator}authError=google`);
    }
  }
}
