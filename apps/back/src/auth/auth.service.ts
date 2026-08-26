import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { JwtService } from "@nestjs/jwt";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { SignInUserDto } from "src/user/dto/signin-user.dto";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import { User } from "src/user/domain/user.entity";
import { UserToken } from "src/common/types/usertoken.interface";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  type AuthTokenPair,
  type AuthTokenType,
} from "./auth-cookies";

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

interface SignedTokenPayload extends UserToken {
  typ: AuthTokenType;
}

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

  private async signToken(user: Pick<User, "id" | "email">, typ: AuthTokenType): Promise<string> {
    const payload: SignedTokenPayload = {
      id: user.id,
      email: user.email,
      typ,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.jwtToken,
      expiresIn: typ === "access" ? ACCESS_TOKEN_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  async signTokenPair(user: Pick<User, "id" | "email">): Promise<AuthTokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(user, "access"),
      this.signToken(user, "refresh"),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<UserToken | null> {
    try {
      const payload = await this.jwtService.verifyAsync<SignedTokenPayload>(token, {
        secret: this.jwtToken,
      });
      if (payload.typ !== "access" || !payload.id) {
        return null;
      }
      return { id: payload.id, email: payload.email };
    } catch {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<UserToken | null> {
    try {
      const payload = await this.jwtService.verifyAsync<SignedTokenPayload>(token, {
        secret: this.jwtToken,
      });
      if (payload.typ !== "refresh" || !payload.id) {
        return null;
      }
      return { id: payload.id, email: payload.email };
    } catch {
      return null;
    }
  }

  async refreshSession(refreshToken: string): Promise<AuthTokenPair | null> {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    const user = await this.userService.findById(payload.id);
    if (!user) {
      return null;
    }

    return this.signTokenPair(user);
  }

  async signIn(userData: SignInUserDto): Promise<AuthTokenPair> {
    const user = await this.userService.signIn(userData);
    if (!user) {
      throw new UnauthorizedException(
        "Email or password is incorrect. Check your credentials and try again.",
      );
    }

    return this.signTokenPair(user);
  }

  async signUp(userData: CreateUserDto): Promise<AuthTokenPair> {
    const newUser = await this.userService.create(userData);
    return this.signTokenPair(newUser);
  }

  async handleGoogleCallback(code: string): Promise<AuthTokenPair> {
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

    return this.signTokenPair(user);
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
