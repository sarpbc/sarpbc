import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { JwtService } from "@nestjs/jwt";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { SignInUserDto } from "src/user/dto/signin-user.dto";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";

export interface GoogleIdTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export type OAuthReturnTo = "front" | "admin";

@Injectable()
export class AuthService {
  private jwtToken: string;
  private googleClientSecret: string;
  private googleClientId: string;
  private googleRedirectUri: string;
  private front_url: string;
  private admin_url: string;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {
    this.jwtToken = this.configService.get<string>("jwt_token")!;
    this.googleClientSecret = this.configService.get<string>("google_client_secret")!;
    this.googleClientId = this.configService.get<string>("google_client_id")!;
    this.googleRedirectUri = this.configService.get<string>("google_redirect_uri")!;
    this.front_url = this.configService.get<string>("front_url")!;
    this.admin_url = this.configService.get<string>("admin_url")!;
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.googleClientId,
      this.googleClientSecret,
      this.googleRedirectUri,
    );
  }

  async signIn(userData: SignInUserDto): Promise<string> {
    const user = await this.userService.signIn(userData);
    if (!user) {
      throw new UnauthorizedException(
        "Email or password is incorrect. Check your credentials and try again.",
      );
    }

    const payload = {
      id: user.id,
      email: user.email,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      secret: this.jwtToken,
      expiresIn: "30d",
    });

    return access_token;
  }

  async signUp(userData: CreateUserDto): Promise<string> {
    const newUser = await this.userService.create(userData);

    const payload = {
      id: newUser.id,
      email: newUser.email,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      secret: this.jwtToken,
      expiresIn: "30d",
    });

    return access_token;
  }

  async handleGoogleCallback(code: string): Promise<string> {
    const oauthClient = this.createOAuthClient();
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    const oauth2 = google.oauth2("v2");
    const { data: profile } = await oauth2.userinfo.get({
      auth: oauthClient,
    });

    if (!profile || !profile.email || !profile.name || !profile.id) {
      throw new UnauthorizedException(
        "Google did not return a complete profile. Try again or use email and password.",
      );
    }

    let user = await this.userService.findOneByGoogleId(profile.id);

    if (!user) {
      const existingByEmail = await this.userService.findOneByEmail(profile.email);

      if (existingByEmail) {
        user = await this.userService.linkGoogleAccount(
          existingByEmail,
          profile.id,
          profile.picture ?? null,
        );
      } else {
        user = await this.userService.createGoogleUser(
          profile.email,
          profile.name,
          profile.id,
          profile.picture ?? null,
        );
      }
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
    };

    const access_token = await this.jwtService.signAsync(tokenPayload, {
      secret: this.jwtToken,
      expiresIn: "30d",
    });

    return access_token;
  }

  getFrontUrl(): string {
    return this.front_url;
  }

  getAdminUrl(): string {
    return this.admin_url;
  }

  /**
   * Resolve post-OAuth redirect URL. Only `front` | `admin` are allowed (no open redirects).
   */
  resolveOAuthReturnUrl(returnTo: string | undefined): string {
    if (returnTo === "admin") {
      return this.admin_url;
    }
    return this.front_url;
  }

  parseOAuthReturnTo(state: string | undefined): OAuthReturnTo {
    if (state === "admin") {
      return "admin";
    }
    return "front";
  }

  getGoogleAuthUrl(returnTo: OAuthReturnTo = "front"): string {
    return this.createOAuthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["profile", "email"],
      state: returnTo,
    });
  }
}
