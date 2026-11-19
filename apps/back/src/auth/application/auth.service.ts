import { AuthenticationError } from "../../common/domain/errors/authentication-error";
import type { AuthenticatedUser } from "../../common/application/models/authenticated-user";
import type { UserService } from "../../user/application/user.service";
import type { CreateAccountInput, SignInInput } from "../../user/application/models/account-input";
import type {
  AuthDestinations,
  GoogleIdentity,
  OAuthReturnTo,
  SessionTokens,
} from "./ports/authentication";

export const parseOAuthReturnTo = (state: string | undefined) =>
  state === "admin" ? "admin" : "front";

export class AuthService {
  constructor(
    private readonly tokens: SessionTokens,
    private readonly google: GoogleIdentity,
    private readonly userService: UserService,
    private readonly destinations: AuthDestinations,
  ) {}

  async signTokenPair(user: AuthenticatedUser) {
    return await this.tokens.sign({ email: user.email, id: user.id });
  }

  async authenticate(accessToken: string) {
    return await this.currentUser(await this.tokens.verify(accessToken, "access"));
  }

  async refreshSession(refreshToken: string) {
    const user = await this.currentUser(await this.tokens.verify(refreshToken, "refresh"));

    return user ? { tokens: await this.signTokenPair(user), user } : null;
  }

  private async currentUser(payload: AuthenticatedUser | null) {
    const user = payload ? await this.userService.findById(payload.id) : null;

    return user ? { email: user.email, id: user.id } : null;
  }

  async signIn(input: SignInInput) {
    const user = await this.userService.signIn(input);

    if (!user) {
      throw new AuthenticationError(
        "Email or password is incorrect. Check your credentials and try again.",
      );
    }

    return await this.signTokenPair(user);
  }

  async signUp(input: CreateAccountInput) {
    return await this.signTokenPair(await this.userService.create(input));
  }

  async handleGoogleCallback(code: string) {
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

  resolveOAuthReturnUrl(returnTo: string | undefined) {
    return returnTo === "admin" ? this.destinations.adminUrl : this.destinations.frontUrl;
  }

  getGoogleAuthUrl(returnTo: OAuthReturnTo = "front") {
    return this.google.authorizationUrl(returnTo);
  }
}
