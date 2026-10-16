import type { UserToken } from "../../../common/application/models/user-token";

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export type AuthTokenType = "access" | "refresh";
export type OAuthReturnTo = "front" | "admin";

export interface SessionTokens {
  sign(user: UserToken): Promise<AuthTokenPair>;
  verify(token: string, type: AuthTokenType): Promise<UserToken | null>;
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
