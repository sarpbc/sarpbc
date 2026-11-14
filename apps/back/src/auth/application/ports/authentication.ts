import type { AuthenticatedUser } from "../../../common/application/models/authenticated-user";

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
  tokens: AuthTokenPair;
}

export type AuthTokenType = "access" | "refresh";

export type OAuthReturnTo = "front" | "admin";

export interface SessionTokens {
  sign(user: AuthenticatedUser): Promise<AuthTokenPair>;
  verify(token: string, type: AuthTokenType): Promise<AuthenticatedUser | null>;
}

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface GoogleIdentity {
  profile(code: string): Promise<GoogleProfile>;
  authorizationUrl(returnTo: OAuthReturnTo): string;
}

export interface AuthDestinations {
  frontUrl: string;
  adminUrl: string;
}
