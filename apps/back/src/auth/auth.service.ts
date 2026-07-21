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

@Injectable()
export class AuthService {
  private jwtToken: string;
  private googleClientSecret: string;
  private googleClientId: string;
  private googleRedirectUri: string;
  private front_url: string;
  private oauthClient;

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

    this.oauthClient = new google.auth.OAuth2(
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
    if (!newUser) {
      throw new UnauthorizedException("User creation failed");
    }

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
    const { tokens } = await this.oauthClient.getToken(code);
    this.oauthClient.setCredentials(tokens);

    const oauth2 = google.oauth2("v2");
    const { data: profile } = await oauth2.userinfo.get({
      auth: this.oauthClient,
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

      if (!user) {
        throw new UnauthorizedException(
          "Could not sign in with Google. Try again or use email and password.",
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

  getGoogleAuthUrl(): string {
    return this.oauthClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["profile", "email"],
    });
  }
}
