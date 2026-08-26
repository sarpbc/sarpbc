import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ExecutionContext } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { AuthGuard } from "./auth.guard";

describe("AuthGuard", () => {
  let guard: AuthGuard;
  const jwtService = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn().mockResolvedValue("rotated-token"),
  };
  const userService = {
    findById: jest.fn(),
  };
  const setCookie = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "jwt_token") {
                return "secret";
              }
              if (key === "production") {
                return false;
              }
              return undefined;
            }),
          },
        },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    guard = module.get(AuthGuard);
    jest.clearAllMocks();
    jwtService.signAsync.mockResolvedValue("rotated-token");
  });

  const createContext = (cookies?: Record<string, string>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ cookies }),
        getResponse: () => ({ setCookie }),
      }),
    }) as ExecutionContext;

  it("throws when cookie is missing", async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns true and attaches user from DB when token is valid", async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: "user-1", email: "a@b.com", typ: "access" });
    userService.findById.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const request: { cookies: Record<string, string>; user?: unknown } = {
      cookies: { access_token: "valid-token" },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setCookie }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "a@b.com" });
  });

  it("attaches current DB email when JWT email is stale", async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: "user-1", email: "old@b.com", typ: "access" });
    userService.findById.mockResolvedValue({ id: "user-1", email: "new@b.com" });
    const request: { cookies: Record<string, string>; user?: unknown } = {
      cookies: { access_token: "valid-token" },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setCookie }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "new@b.com" });
  });

  it("throws when user is missing from DB", async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: "user-1", email: "a@b.com", typ: "access" });
    userService.findById.mockResolvedValue(null);
    const context = createContext({ access_token: "valid-token" });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rotates cookies from a valid refresh token when access is missing", async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: "user-1", email: "a@b.com", typ: "refresh" });
    userService.findById.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const request: { cookies: Record<string, string>; user?: unknown } = {
      cookies: { refresh_token: "refresh-token" },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setCookie }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "a@b.com" });
    expect(setCookie).toHaveBeenCalledWith(
      "access_token",
      "rotated-token",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(setCookie).toHaveBeenCalledWith(
      "refresh_token",
      "rotated-token",
      expect.objectContaining({ httpOnly: true }),
    );
  });
});
