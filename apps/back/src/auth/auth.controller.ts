import { Body, Controller, Get, Post, Query, Request, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { SignInUserDto } from "src/user/dto/signin-user.dto";
import type { FastifyReply } from "fastify";
import { ConfigService } from "@nestjs/config";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private setAccessTokenCookie(res: FastifyReply, access_token: string) {
    const production = this.configService.get<boolean>("production");

    const cookieOptions: Record<string, any> = {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    };

    if (production) {
      cookieOptions.domain = ".sarpbc.org";
    }

    res.setCookie("access_token", access_token, cookieOptions);
  }

  @Post("login")
  async signIn(@Body() userData: SignInUserDto, @Res() res: FastifyReply) {
    const access_token = await this.authService.signIn(userData);

    this.setAccessTokenCookie(res, access_token);

    return res.code(200).send({ success: true });
  }

  @Get("logout")
  logout(@Res() res: FastifyReply) {
    res.clearCookie("access_token");
    return res.send({ success: true });
  }

  @Post("signup")
  async signUp(@Body() userData: CreateUserDto, @Res() res: FastifyReply) {
    const access_token = await this.authService.signUp(userData);

    this.setAccessTokenCookie(res, access_token);

    return res.code(200).send({ success: true });
  }

  @UseGuards(AuthGuard)
  @Get("profile")
  getProfile(@Request() req: any) {
    return req.user;
  }

  @Get("google")
  redirectToGoogle(@Res() res: FastifyReply) {
    const url = this.authService.getGoogleAuthUrl();
    return res.code(302).redirect(url);
  }

  @Get("google/callback")
  async handleGoogleCallback(@Query("code") code: string, @Res() res: FastifyReply) {
    try {
      const access_token = await this.authService.handleGoogleCallback(code);

      this.setAccessTokenCookie(res, access_token);

      return res.code(302).redirect(this.authService.getFrontUrl());
    } catch (error) {
      console.error(error);
      return res.code(302).redirect(this.authService.getFrontUrl());
    }
  }
}
