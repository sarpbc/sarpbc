import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExecutionContext } from "@nestjs/common";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthenticationError } from "../../../common/domain/errors/authentication-error";
import { PatAuthGuard } from "./pat.guard";
import { PatService, PatUser } from "../../application/pat.service";

interface PatGuardTestHeaders {
  authorization?: string;
}

interface PatGuardTestRequest {
  headers: PatGuardTestHeaders;
  user?: PatUser;
}

const createContext = (headers: PatGuardTestHeaders = {}): ExecutionContext => {
  const request: PatGuardTestRequest = { headers };

  return new ExecutionContextHost([request]);
};

describe(PatAuthGuard, () => {
  let guard: PatAuthGuard;

  const patService = {
    resolveUser: vi.fn<PatService["resolveUser"]>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatAuthGuard, { provide: PatService, useValue: patService }],
    }).compile();

    guard = module.get(PatAuthGuard);
    vi.clearAllMocks();
  });

  it("throws when the authorization header is missing", async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("attaches the resolved user for a valid bearer token", async () => {
    patService.resolveUser.mockResolvedValue({ id: "user-1", email: "a@b.com", role: "admin" });

    const request: PatGuardTestRequest = {
      headers: { authorization: "Bearer sarpbc_pat_valid" },
    };

    const context = new ExecutionContextHost([request]);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toStrictEqual({ id: "user-1", email: "a@b.com", role: "admin" });
    expect(patService.resolveUser).toHaveBeenCalledExactlyOnceWith("sarpbc_pat_valid");
  });
});
