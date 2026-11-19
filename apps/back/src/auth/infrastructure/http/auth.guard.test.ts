import type { CookieSerializeOptions } from "@fastify/cookie";
import { ConfigService } from "@nestjs/config";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "../../../common/application/models/authenticated-user";
import { AuthenticationError } from "../../../common/domain/errors/authentication-error";
import type { PasswordHasher } from "../../../user/application/ports/password-hasher";
import { MemoryUserStore } from "../../../user/application/ports/user-store.test-utils";
import { UserService } from "../../../user/application/user.service";
import { User } from "../../../user/domain/user";
import { AuthService } from "../../application/auth.service";
import type { GoogleIdentity } from "../../application/ports/authentication";
import { JwtTokenGateway } from "../jwt-token.gateway";
import { AuthGuard } from "./auth.guard";

interface AuthGuardTestCookies {
  access_token?: string;
  refresh_token?: string;
}

interface AuthGuardTestRequest {
  cookies?: AuthGuardTestCookies;
  user?: AuthenticatedUser;
}

interface SetCookie {
  name: string;
  value: string;
  options: CookieSerializeOptions;
}

const passwords: PasswordHasher = {
  compare: async (password, hash) => hash === `hashed:${password}`,
  hash: async (password) => `hashed:${password}`,
};

const unusedGoogle: GoogleIdentity = {
  authorizationUrl: () => {
    throw new Error("unused");
  },
  profile: async () => await Promise.reject(new Error("unused")),
};

const jwtTokens = new JwtTokenGateway(new JwtService(), "secret");
const registered = { email: "a@b.com", id: "user-1" };

const createGuard = (...users: User[]) => {
  const store = new MemoryUserStore(users);

  const authService = new AuthService(
    jwtTokens,
    unusedGoogle,
    new UserService(store, store.transaction, passwords),
    { adminUrl: "", frontUrl: "" },
  );

  return new AuthGuard(authService, new ConfigService());
};

const contextFor = (request: AuthGuardTestRequest) => {
  const cookies: SetCookie[] = [];

  const reply = {
    setCookie: (name: string, value: string, options: CookieSerializeOptions) => {
      cookies.push({ name, options, value });
    },
  };

  return { context: new ExecutionContextHost([request, reply]), cookies };
};

const member = () => Object.assign(new User("a@b.com", "alice", "hash"), { id: "user-1" });

describe(AuthGuard, () => {
  it("throws when cookie is missing", async () => {
    const { context } = contextFor({});

    await expect(createGuard(member()).canActivate(context)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("returns true and attaches the user resolved from a valid access token", async () => {
    const { accessToken } = await jwtTokens.sign(registered);
    const request: AuthGuardTestRequest = { cookies: { access_token: accessToken } };
    const { context } = contextFor(request);

    await expect(createGuard(member()).canActivate(context)).resolves.toBe(true);
    expect(request.user).toStrictEqual(registered);
  });

  it("throws when the access token is rejected and there is no refresh token", async () => {
    const { context } = contextFor({ cookies: { access_token: "invalid-token" } });

    await expect(createGuard(member()).canActivate(context)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("rotates cookies from a valid refresh token when access is missing", async () => {
    const { refreshToken } = await jwtTokens.sign(registered);
    const request: AuthGuardTestRequest = { cookies: { refresh_token: refreshToken } };
    const { context, cookies } = contextFor(request);

    await expect(createGuard(member()).canActivate(context)).resolves.toBe(true);
    expect(request.user).toStrictEqual(registered);
    expect(cookies.map(({ name, options }) => [name, options.httpOnly])).toStrictEqual([
      ["access_token", true],
      ["refresh_token", true],
    ]);
    const [rotatedAccess, rotatedRefresh] = cookies;

    await expect(jwtTokens.verify(rotatedAccess?.value ?? "", "access")).resolves.toStrictEqual(
      registered,
    );
    await expect(jwtTokens.verify(rotatedRefresh?.value ?? "", "refresh")).resolves.toStrictEqual(
      registered,
    );
  });

  it("throws when the refresh token is rejected", async () => {
    const { context } = contextFor({ cookies: { refresh_token: "invalid-token" } });

    await expect(createGuard(member()).canActivate(context)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });
});
