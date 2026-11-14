import { beforeEach, describe, expect, it, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ExecutionContext } from "@nestjs/common";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { AuthenticatedUser } from "../../../common/application/models/authenticated-user";
import { AuthenticationError } from "../../../common/domain/errors";
import { AuthService } from "../../application/auth.service";
import { AuthGuard } from "./auth.guard";

interface AuthGuardTestCookies {
  access_token?: string;
  refresh_token?: string;
}

interface AuthGuardTestRequest {
  cookies?: AuthGuardTestCookies;
  user?: AuthenticatedUser;
}

describe("AuthGuard", () => {
  let guard: AuthGuard;

  const authService = {
    authenticate: vi.fn(),
    refreshSession: vi.fn(),
  };

  const setCookie = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { get: vi.fn() } },
      ],
    }).compile();

    guard = module.get(AuthGuard);
    vi.clearAllMocks();
  });

  const contextFor = (request: AuthGuardTestRequest): ExecutionContext =>
    new ExecutionContextHost([request, { setCookie }]);

  it("throws when cookie is missing", async () => {
    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("returns true and attaches the user resolved from a valid access token", async () => {
    authService.authenticate.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const request: AuthGuardTestRequest = { cookies: { access_token: "valid-token" } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "a@b.com" });
    expect(authService.authenticate).toHaveBeenCalledWith("valid-token");
  });

  it("throws when the access token is rejected and there is no refresh token", async () => {
    authService.authenticate.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor({ cookies: { access_token: "valid-token" } })),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rotates cookies from a valid refresh token when access is missing", async () => {
    authService.refreshSession.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com" },
      tokens: { accessToken: "new-access", refreshToken: "new-refresh" },
    });
    const request: AuthGuardTestRequest = { cookies: { refresh_token: "refresh-token" } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "a@b.com" });
    expect(setCookie).toHaveBeenCalledWith(
      "access_token",
      "new-access",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(setCookie).toHaveBeenCalledWith(
      "refresh_token",
      "new-refresh",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("throws when the refresh token is rejected", async () => {
    authService.refreshSession.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor({ cookies: { refresh_token: "refresh-token" } })),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});
