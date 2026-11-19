import { setImmediate as nextTick } from "node:timers/promises";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import { AuthenticationError } from "../../common/domain/errors/authentication-error";
import { AuthService, parseOAuthReturnTo } from "./auth.service";
import { GoogleIdentityGateway } from "../infrastructure/google-identity.gateway";
import type { GoogleOAuthSession } from "../infrastructure/google-identity.gateway";
import { JwtTokenGateway } from "../infrastructure/jwt-token.gateway";
import { User } from "../../user/domain/user";
import type { GoogleIdentity } from "./ports/authentication";
import { UserService } from "../../user/application/user.service";
import type { PasswordHasher } from "../../user/application/ports/password-hasher";
import { MemoryUserStore } from "../../user/application/ports/user-store.test-utils";

const passwords: PasswordHasher = {
  compare: async (password, hash) => hash === `hashed:${password}`,
  hash: async (password) => `hashed:${password}`,
};

const alice = (overrides: Partial<User> = {}, email = "a@b.com") =>
  Object.assign(new User(email, "alice", "hashed:ok"), { id: "user-1" }, overrides);

const waitUntil = async (predicate: () => boolean, startedAt = Date.now()) => {
  if (predicate()) {
    return;
  }

  if (Date.now() - startedAt > 1000) {
    throw new Error("Timed out waiting for overlapping OAuth callbacks");
  }

  await nextTick();
  await waitUntil(predicate, startedAt);
};

let newGoogleSession: () => GoogleOAuthSession = () => {
  throw new Error("unused");
};

const jwtTokens = new JwtTokenGateway(new JwtService(), "secret");

const unusedGoogle: GoogleIdentity = {
  authorizationUrl: () => {
    throw new Error("unused");
  },
  profile: async () => await Promise.reject(new Error("unused")),
};

const urls = { adminUrl: "http://localhost:4002", frontUrl: "http://localhost:4000" };

const serviceOver = (...users: User[]) => {
  const store = new MemoryUserStore(users);
  const userService = new UserService(store, store.transaction, passwords);

  return { service: new AuthService(jwtTokens, unusedGoogle, userService, urls), store };
};

describe(AuthService, () => {
  describe("signIn", () => {
    it("throws AuthenticationError with actionable message for bad credentials", async () => {
      const { service } = serviceOver(alice());

      await expect(service.signIn({ email: "a@b.com", password: "wrong" })).rejects.toBeInstanceOf(
        AuthenticationError,
      );

      await expect(service.signIn({ email: "a@b.com", password: "wrong" })).rejects.toThrow(
        /Email or password is incorrect/u,
      );
    });

    it("returns a token pair when credentials are valid", async () => {
      const { service } = serviceOver(alice());

      const { accessToken, refreshToken } = await service.signIn({
        email: "a@b.com",
        password: "ok",
      });

      await expect(jwtTokens.verify(accessToken, "access")).resolves.toStrictEqual({
        email: "a@b.com",
        id: "user-1",
      });
      await expect(jwtTokens.verify(refreshToken, "refresh")).resolves.toStrictEqual({
        email: "a@b.com",
        id: "user-1",
      });
    });
  });

  describe("session", () => {
    it("authenticates with the current database email, not the token's", async () => {
      const { service } = serviceOver(alice({}, "new@b.com"));

      const { accessToken, refreshToken } = await jwtTokens.sign({
        email: "old@b.com",
        id: "user-1",
      });

      await expect(service.authenticate(accessToken)).resolves.toStrictEqual({
        email: "new@b.com",
        id: "user-1",
      });
      await expect(service.authenticate(refreshToken)).resolves.toBeNull();
    });

    it("rejects a valid token whose user no longer exists", async () => {
      const { service } = serviceOver();

      const { accessToken, refreshToken } = await jwtTokens.sign({
        email: "a@b.com",
        id: "user-1",
      });

      await expect(service.authenticate(accessToken)).resolves.toBeNull();
      await expect(service.refreshSession(refreshToken)).resolves.toBeNull();
    });

    it("refreshes into the user and a new token pair", async () => {
      const { service } = serviceOver(alice());

      const { accessToken, refreshToken } = await jwtTokens.sign({
        email: "a@b.com",
        id: "user-1",
      });

      const refreshed = await service.refreshSession(refreshToken);

      expect(refreshed?.user).toStrictEqual({ email: "a@b.com", id: "user-1" });
      await expect(
        jwtTokens.verify(refreshed?.tokens.accessToken ?? "", "access"),
      ).resolves.toStrictEqual({ email: "a@b.com", id: "user-1" });
      await expect(
        jwtTokens.verify(refreshed?.tokens.refreshToken ?? "", "refresh"),
      ).resolves.toStrictEqual({ email: "a@b.com", id: "user-1" });
      await expect(service.refreshSession(accessToken)).resolves.toBeNull();
    });
  });

  describe("OAuth return destination", () => {
    it("parses returnTo allowlist and defaults to front", () => {
      expect(parseOAuthReturnTo("admin")).toBe("admin");
      expect(parseOAuthReturnTo("front")).toBe("front");
      expect(parseOAuthReturnTo("https://evil.example")).toBe("front");
      expect(parseOAuthReturnTo(undefined)).toBe("front");
    });

    it("resolves only FRONT_URL or ADMIN_URL", () => {
      const { service } = serviceOver();

      expect(service.resolveOAuthReturnUrl("admin")).toBe("http://localhost:4002");
      expect(service.resolveOAuthReturnUrl("front")).toBe("http://localhost:4000");
      expect(service.resolveOAuthReturnUrl(undefined)).toBe("http://localhost:4000");
    });
  });

  describe("handleGoogleCallback", () => {
    it("does not swap Google profiles when two callbacks overlap", async () => {
      const { promise: holdGetToken, resolve: releaseGetToken } =
        Promise.withResolvers<undefined>();

      let getTokenStarted = 0;

      const profiles = {
        "code-a": { email: "a@example.com", id: "google-a", name: "Alice" },
        "code-b": { email: "b@example.com", id: "google-b", name: "Bob" },
      } as const;

      newGoogleSession = () => {
        let accessToken: string | null | undefined;

        return {
          generateAuthUrl: () => {
            throw new Error("unused");
          },
          getToken: async (code) => {
            getTokenStarted += 1;
            await holdGetToken;

            return { tokens: { access_token: code } };
          },
          setCredentials: (tokens) => {
            accessToken = tokens.access_token;
          },
          userinfo: async () => {
            const profile =
              accessToken === "code-a" || accessToken === "code-b"
                ? profiles[accessToken]
                : undefined;

            if (!profile) {
              throw new Error(`Unknown Google token ${accessToken}`);
            }

            return profile;
          },
        };
      };

      const store = new MemoryUserStore();

      const service = new AuthService(
        jwtTokens,
        new GoogleIdentityGateway(() => newGoogleSession()),
        new UserService(store, store.transaction, passwords),
        urls,
      );

      const first = service.handleGoogleCallback("code-a");
      const second = service.handleGoogleCallback("code-b");

      await waitUntil(() => getTokenStarted === 2);
      releaseGetToken(undefined);

      const [a, b] = await Promise.all([first, second]);

      await expect(jwtTokens.verify(a.accessToken, "access")).resolves.toMatchObject({
        email: "a@example.com",
      });
      await expect(jwtTokens.verify(b.accessToken, "access")).resolves.toMatchObject({
        email: "b@example.com",
      });
      expect(
        store.users.map(({ email, googleId, userName }) => ({ email, googleId, userName })),
      ).toStrictEqual([
        { email: "a@example.com", googleId: "google-a", userName: "Alice" },
        { email: "b@example.com", googleId: "google-b", userName: "Bob" },
      ]);
    });
  });
});
