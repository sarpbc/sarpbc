import { AuthenticationError } from "../../common/domain/errors";
import type { UserToken } from "../../common/application/models/user-token";
import type { UserService } from "../../user/application/user.service";
import type { CreateAccountInput, SignInInput } from "../../user/application/models/account-input";
import type {
  AuthDestinations,
  AuthTokenPair,
  GoogleIdentity,
  OAuthReturnTo,
  SessionTokens,
} from "./ports/authentication";

export class AuthService {
  constructor(
    private readonly tokens: SessionTokens,
    private readonly google: GoogleIdentity,
    private readonly userService: UserService,
    private readonly destinations: AuthDestinations,
  ) {}

  signTokenPair(user: UserToken): Promise<AuthTokenPair> {
    return this.tokens.sign({ id: user.id, email: user.email });
  }

  async refreshSession(refreshToken: string): Promise<AuthTokenPair | null> {
    const payload = await this.tokens.verify(refreshToken, "refresh");
    if (!payload) return null;
    const user = await this.userService.findById(payload.id);
    return user ? this.signTokenPair(user) : null;
  }

  async signIn(input: SignInInput): Promise<AuthTokenPair> {
    const user = await this.userService.signIn(input);
    if (!user) {
      throw new AuthenticationError(
        "Email or password is incorrect. Check your credentials and try again.",
      );
    }
    return this.signTokenPair(user);
  }

  async signUp(input: CreateAccountInput): Promise<AuthTokenPair> {
    return this.signTokenPair(await this.userService.create(input));
  }

  async handleGoogleCallback(code: string): Promise<AuthTokenPair> {
    const profile = await this.google.profile(code);
    let user = await this.userService.findOneByGoogleId(profile.id);
    if (!user) {
      const existing = await this.userService.findOneByEmail(profile.email);
      user = existing
        ? await this.userService.linkGoogleAccount(existing, profile.id, profile.picture)
        : await this.userService.createGoogleUser(
            profile.email,
            profile.name,
            profile.id,
            profile.picture,
          );
    }
    return this.signTokenPair(user);
  }

  getFrontUrl(): string {
    return this.destinations.frontUrl;
  }

  getAdminUrl(): string {
    return this.destinations.adminUrl;
  }

  resolveOAuthReturnUrl(returnTo: string | undefined): string {
    return returnTo === "admin" ? this.destinations.adminUrl : this.destinations.frontUrl;
  }

  parseOAuthReturnTo(state: string | undefined): OAuthReturnTo {
    return state === "admin" ? "admin" : "front";
  }

  getGoogleAuthUrl(returnTo: OAuthReturnTo = "front"): string {
    return this.google.authorizationUrl(returnTo);
  }
}
