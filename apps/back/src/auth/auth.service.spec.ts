import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import { AuthService } from "./auth.service";
import { UserService } from "../user/user.service";
import { User } from "../user/domain/user.entity";

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn(),
    },
    oauth2: jest.fn(),
  },
}));

async function waitUntil(predicate: () => boolean): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > 1000) {
      throw new Error("Timed out waiting for overlapping OAuth callbacks");
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

describe("AuthService", () => {
  let service: AuthService;
  const userService = {
    signIn: jest.fn(),
    findOneByGoogleId: jest.fn(),
    findOneByEmail: jest.fn(),
    createGoogleUser: jest.fn(),
    linkGoogleAccount: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue("jwt-token"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case "jwt_token":
                  return "secret";
                case "google_client_secret":
                  return "secret";
                case "google_client_id":
                  return "client-id";
                case "google_redirect_uri":
                  return "http://localhost/callback";
                case "front_url":
                  return "http://localhost:4000";
                case "admin_url":
                  return "http://localhost:4002";
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe("signIn", () => {
    it("throws UnauthorizedException with actionable message for bad credentials", async () => {
      userService.signIn.mockResolvedValue(null);

      await expect(service.signIn({ email: "a@b.com", password: "wrong" })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      await expect(service.signIn({ email: "a@b.com", password: "wrong" })).rejects.toThrow(
        /Email or password is incorrect/,
      );
    });

    it("returns a JWT when credentials are valid", async () => {
      userService.signIn.mockResolvedValue(
        Object.assign(new User("a@b.com", "alice", "hash"), { id: "user-1" }),
      );

      await expect(service.signIn({ email: "a@b.com", password: "ok" })).resolves.toBe("jwt-token");
      expect(jwtService.signAsync).toHaveBeenCalled();
    });
  });

  describe("OAuth return destination", () => {
    it("parses returnTo allowlist and defaults to front", () => {
      expect(service.parseOAuthReturnTo("admin")).toBe("admin");
      expect(service.parseOAuthReturnTo("front")).toBe("front");
      expect(service.parseOAuthReturnTo("https://evil.example")).toBe("front");
      expect(service.parseOAuthReturnTo(undefined)).toBe("front");
    });

    it("resolves only FRONT_URL or ADMIN_URL", () => {
      expect(service.resolveOAuthReturnUrl("admin")).toBe("http://localhost:4002");
      expect(service.resolveOAuthReturnUrl("front")).toBe("http://localhost:4000");
      expect(service.resolveOAuthReturnUrl(undefined)).toBe("http://localhost:4000");
    });
  });

  describe("handleGoogleCallback", () => {
    it("does not swap Google profiles when two callbacks overlap", async () => {
      let releaseGetToken!: () => void;
      const holdGetToken = new Promise<void>((resolve) => {
        releaseGetToken = resolve;
      });
      let getTokenStarted = 0;

      const profiles: Record<string, { id: string; email: string; name: string }> = {
        "code-a": { id: "google-a", email: "a@example.com", name: "Alice" },
        "code-b": { id: "google-b", email: "b@example.com", name: "Bob" },
      };

      (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => {
        const client = {
          credentials: {} as { access_token?: string },
          getToken: jest.fn(async (code: string) => {
            getTokenStarted += 1;
            await holdGetToken;
            return { tokens: { access_token: code } };
          }),
          setCredentials: jest.fn((tokens: { access_token: string }) => {
            client.credentials = tokens;
          }),
          generateAuthUrl: jest.fn(),
        };
        return client;
      });

      (google.oauth2 as unknown as jest.Mock).mockReturnValue({
        userinfo: {
          get: jest.fn(async ({ auth }: { auth: { credentials: { access_token?: string } } }) => {
            const code = auth.credentials.access_token;
            const profile = code ? profiles[code] : undefined;
            if (!profile) {
              throw new Error(`Unknown Google token ${code}`);
            }
            return { data: profile };
          }),
        },
      });

      userService.findOneByGoogleId.mockResolvedValue(null);
      userService.findOneByEmail.mockResolvedValue(null);
      userService.createGoogleUser.mockImplementation(
        async (email: string, name: string, googleId: string) =>
          Object.assign(new User(email, name, null, googleId), { id: `user-${googleId}` }),
      );
      jwtService.signAsync.mockImplementation(
        async (payload: { id: string }) => `jwt-${payload.id}`,
      );

      const first = service.handleGoogleCallback("code-a");
      const second = service.handleGoogleCallback("code-b");

      await waitUntil(() => getTokenStarted === 2);
      releaseGetToken();

      await expect(Promise.all([first, second])).resolves.toEqual([
        "jwt-user-google-a",
        "jwt-user-google-b",
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
