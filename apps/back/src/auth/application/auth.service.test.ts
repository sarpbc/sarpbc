import { setImmediate as nextTick } from "node:timers/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "../../common/domain/errors/authentication-error";
import { AuthService, parseOAuthReturnTo } from "./auth.service";
import { GoogleIdentityGateway } from "../infrastructure/google-identity.gateway";
import type { GoogleOAuthSession } from "../infrastructure/google-identity.gateway";
import { JwtTokenGateway } from "../infrastructure/jwt-token.gateway";
import { User } from "../../user/domain/user";
import type { GoogleIdentity, SessionTokens } from "./ports/authentication";
import { UserService } from "../../user/application/user.service";
import { unconstructed } from "../../../test/doubles";

async function waitUntil(predicate: () => boolean, startedAt = Date.now()): Promise<void> {
  if (predicate()) {
    return;
  }

  if (Date.now() - startedAt > 1000) {
    throw new Error("Timed out waiting for overlapping OAuth callbacks");
  }

  await nextTick();
  await waitUntil(predicate, startedAt);
}

let newGoogleSession: () => GoogleOAuthSession = () => {
  throw new Error("unused");
};

describe(AuthService, () => {
  let service: AuthService;

  const userServiceMocks = {
    signIn: vi.fn<UserService["signIn"]>(),
    findOneByGoogleId: vi.fn<UserService["findOneByGoogleId"]>(),
    findOneByEmail: vi.fn<UserService["findOneByEmail"]>(),
    createGoogleUser: vi.fn<UserService["createGoogleUser"]>(),
    linkGoogleAccount: vi.fn<UserService["linkGoogleAccount"]>(),
    create: vi.fn<UserService["create"]>(),
  };

  const userService = Object.assign(unconstructed(UserService), userServiceMocks);

  const jwtService = {
    signAsync: vi
      .fn<(payload: string | Buffer | { id?: string }) => Promise<string>>()
      .mockResolvedValue("jwt-token"),
  };

  beforeEach(async () => {
    service = new AuthService(
      new JwtTokenGateway({ ...jwtService, verifyAsync: vi.fn<() => Promise<never>>() }, "secret"),
      new GoogleIdentityGateway(() => newGoogleSession()),
      userService,
      { frontUrl: "http://localhost:4000", adminUrl: "http://localhost:4002" },
    );
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("throws AuthenticationError with actionable message for bad credentials", async () => {
      userService.signIn.mockResolvedValue(null);

      await expect(service.signIn({ email: "a@b.com", password: "wrong" })).rejects.toBeInstanceOf(
        AuthenticationError,
      );

      await expect(service.signIn({ email: "a@b.com", password: "wrong" })).rejects.toThrow(
        /Email or password is incorrect/,
      );
    });

    it("returns a token pair when credentials are valid", async () => {
      userService.signIn.mockResolvedValue(
        Object.assign(new User("a@b.com", "alice", "hash"), { id: "user-1" }),
      );

      await expect(service.signIn({ email: "a@b.com", password: "ok" })).resolves.toStrictEqual({
        accessToken: "jwt-token",
        refreshToken: "jwt-token",
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe("session", () => {
    const tokens = {
      sign: vi
        .fn<SessionTokens["sign"]>()
        .mockResolvedValue({ accessToken: "access", refreshToken: "refresh" }),
      verify: vi.fn<SessionTokens["verify"]>(),
    };

    const findById = vi.fn<UserService["findById"]>();
    const sessionUsers = Object.assign(unconstructed(UserService), { findById });

    const unusedGoogle: GoogleIdentity = {
      profile: async () => await Promise.reject(new Error("unused")),
      authorizationUrl: () => {
        throw new Error("unused");
      },
    };

    const sessions = new AuthService(tokens, unusedGoogle, sessionUsers, {
      frontUrl: "",
      adminUrl: "",
    });

    it("authenticates with the current database email, not the token's", async () => {
      tokens.verify.mockResolvedValue({ id: "user-1", email: "old@b.com" });
      findById.mockResolvedValue(Object.assign(new User("new@b.com", "x"), { id: "user-1" }));

      await expect(sessions.authenticate("jwt")).resolves.toStrictEqual({
        id: "user-1",
        email: "new@b.com",
      });
      expect(tokens.verify).toHaveBeenCalledWith("jwt", "access");
    });

    it("rejects a valid token whose user no longer exists", async () => {
      tokens.verify.mockResolvedValue({ id: "user-1", email: "a@b.com" });
      findById.mockResolvedValue(null);

      await expect(sessions.authenticate("jwt")).resolves.toBeNull();
      await expect(sessions.refreshSession("jwt")).resolves.toBeNull();
    });

    it("refreshes into the user and a new token pair", async () => {
      tokens.verify.mockResolvedValue({ id: "user-1", email: "a@b.com" });
      findById.mockResolvedValue(Object.assign(new User("a@b.com", "x"), { id: "user-1" }));

      await expect(sessions.refreshSession("jwt")).resolves.toStrictEqual({
        user: { id: "user-1", email: "a@b.com" },
        tokens: { accessToken: "access", refreshToken: "refresh" },
      });
      expect(tokens.verify).toHaveBeenCalledWith("jwt", "refresh");
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
        "code-a": { id: "google-a", email: "a@example.com", name: "Alice" },
        "code-b": { id: "google-b", email: "b@example.com", name: "Bob" },
      } as const;

      newGoogleSession = () => {
        let accessToken: string | null | undefined;

        return {
          getToken: async (code) => {
            getTokenStarted += 1;
            await holdGetToken;

            return { tokens: { access_token: code } };
          },
          setCredentials: (tokens) => {
            accessToken = tokens.access_token;
          },
          generateAuthUrl: () => {
            throw new Error("unused");
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

      userService.findOneByGoogleId.mockResolvedValue(null);
      userService.findOneByEmail.mockResolvedValue(null);
      userService.createGoogleUser.mockImplementation(
        async (email: string, name: string, googleId: string) =>
          Object.assign(new User(email, name, null, googleId), { id: `user-${googleId}` }),
      );
      jwtService.signAsync.mockImplementation(
        async (payload) =>
          `jwt-${payload instanceof Object && "id" in payload ? String(payload.id) : ""}`,
      );

      const first = service.handleGoogleCallback("code-a");
      const second = service.handleGoogleCallback("code-b");

      await waitUntil(() => getTokenStarted === 2);
      releaseGetToken(undefined);

      await expect(Promise.all([first, second])).resolves.toStrictEqual([
        { accessToken: "jwt-user-google-a", refreshToken: "jwt-user-google-a" },
        { accessToken: "jwt-user-google-b", refreshToken: "jwt-user-google-b" },
      ]);
      expect(userService.createGoogleUser).toHaveBeenCalledWith(
        "a@example.com",
        "Alice",
        "google-a",
        null,
      );
      expect(userService.createGoogleUser).toHaveBeenCalledWith(
        "b@example.com",
        "Bob",
        "google-b",
        null,
      );
    });
  });
});
