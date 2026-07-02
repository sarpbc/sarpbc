import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";

describe("AuthGuard", () => {
  let guard: AuthGuard;
  const jwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("secret") },
        },
      ],
    }).compile();

    guard = module.get(AuthGuard);
    jest.clearAllMocks();
  });

  const createContext = (cookies?: Record<string, string>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ cookies }),
      }),
    }) as ExecutionContext;

  it("throws when cookie is missing", async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns true and attaches user when token is valid", async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: "user-1", email: "a@b.com" });
    const request: { cookies: Record<string, string>; user?: unknown } = {
      cookies: { access_token: "valid-token" },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ sub: "user-1", email: "a@b.com" });
  });
});
