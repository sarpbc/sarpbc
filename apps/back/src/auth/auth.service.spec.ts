import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { UserService } from "../user/user.service";
import { User } from "../user/domain/user.entity";

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
});
