import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PatAuthGuard } from "./pat.guard";
import { PatService, PatUser } from "./pat.service";

interface PatGuardTestHeaders {
  authorization?: string;
}

interface PatGuardTestRequest {
  headers: PatGuardTestHeaders;
  user?: PatUser;
}

describe("PatAuthGuard", () => {
  let guard: PatAuthGuard;
  const patService = {
    resolveUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatAuthGuard, { provide: PatService, useValue: patService }],
    }).compile();

    guard = module.get(PatAuthGuard);
    jest.clearAllMocks();
  });

  const createContext = (headers: PatGuardTestHeaders = {}): ExecutionContext => {
    const request: PatGuardTestRequest = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  };

  it("throws when the authorization header is missing", async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches the resolved user for a valid bearer token", async () => {
    patService.resolveUser.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const request: PatGuardTestRequest = {
      headers: { authorization: "Bearer sarpbc_pat_valid" },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "a@b.com" });
    expect(patService.resolveUser).toHaveBeenCalledWith("sarpbc_pat_valid");
  });
});
