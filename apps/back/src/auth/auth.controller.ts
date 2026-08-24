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

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private posthog: PostHogService,
  ) {}

  private accessTokenCookieOptions(includeMaxAge = true): Record<string, unknown> {
    const production = this.configService.get<boolean>("production");

    const cookieOptions: Record<string, unknown> = {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      path: "/",
    };

    if (includeMaxAge) {
      cookieOptions.maxAge = 30 * 24 * 60 * 60;
    }

    if (production) {
      cookieOptions.domain = ".sarpbc.org";
    }

    return cookieOptions;
  }

  private setAccessTokenCookie(res: FastifyReply, access_token: string) {
    res.setCookie("access_token", access_token, this.accessTokenCookieOptions(true));
  }

  private clearAccessTokenCookie(res: FastifyReply) {
    res.clearCookie("access_token", this.accessTokenCookieOptions(false));
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  async signIn(
    @Body() userData: SignInUserDto,
    @Res() res: FastifyReply,
    @Request() req: FastifyRequest,
  ) {
    const access_token = await this.authService.signIn(userData);

    this.setAccessTokenCookie(res, access_token);

    const distinctId = req.headers["x-posthog-distinct-id"] as string | undefined;
    const sessionId = req.headers["x-posthog-session-id"] as string | undefined;
    this.posthog.capture({ distinctId, event: "server_user_logged_in", sessionId });
    await this.posthog.flush();

    return res.code(200).send({ success: true });
  }

  @Get("logout")
  logout(@Res() res: FastifyReply) {
    this.clearAccessTokenCookie(res);
    return res.send({ success: true });
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("signup")
  async signUp(
    @Body() userData: CreateUserDto,
    @Res() res: FastifyReply,
    @Request() req: FastifyRequest,
  ) {
    const access_token = await this.authService.signUp(userData);

    this.setAccessTokenCookie(res, access_token);

    const distinctId = req.headers["x-posthog-distinct-id"] as string | undefined;
    const sessionId = req.headers["x-posthog-session-id"] as string | undefined;
    this.posthog.capture({ distinctId, event: "server_user_signed_up", sessionId });
    await this.posthog.flush();

    return res.code(200).send({ success: true });
  }

  @UseGuards(AuthGuard)
  @Get("profile")
  getProfile(@Request() req: any) {
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
      const access_token = await this.authService.handleGoogleCallback(code);

      this.setAccessTokenCookie(res, access_token);

      return res.code(302).redirect(returnUrl);
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      const separator = returnUrl.includes("?") ? "&" : "?";
      return res.code(302).redirect(`${returnUrl}${separator}authError=google`);
    }
  }
}
