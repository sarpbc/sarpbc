import { AuthenticationError } from "../../common/domain/errors";
import type { AuthenticatedUser } from "../../common/application/models/authenticated-user";
import type { UserService } from "../../user/application/user.service";
import type { CreateAccountInput, SignInInput } from "../../user/application/models/account-input";
import type {
  AuthDestinations,
  AuthSession,
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

  async signTokenPair(user: AuthenticatedUser): Promise<AuthTokenPair> {
    return await this.tokens.sign({ id: user.id, email: user.email });
  }

  async authenticate(accessToken: string): Promise<AuthenticatedUser | null> {
    return await this.currentUser(await this.tokens.verify(accessToken, "access"));
  }

  async refreshSession(refreshToken: string): Promise<AuthSession | null> {
    const user = await this.currentUser(await this.tokens.verify(refreshToken, "refresh"));

    return user ? { user, tokens: await this.signTokenPair(user) } : null;
  }

  private async currentUser(payload: AuthenticatedUser | null): Promise<AuthenticatedUser | null> {
    const user = payload ? await this.userService.findById(payload.id) : null;

    return user ? { id: user.id, email: user.email } : null;
  }

  async signIn(input: SignInInput): Promise<AuthTokenPair> {
    const user = await this.userService.signIn(input);

    if (!user) {
      throw new AuthenticationError(
        "Email or password is incorrect. Check your credentials and try again.",
      );
    }

    return await this.signTokenPair(user);
  }

  async signUp(input: CreateAccountInput): Promise<AuthTokenPair> {
    return await this.signTokenPair(await this.userService.create(input));
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

    return await this.signTokenPair(user);
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
