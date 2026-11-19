import { beforeEach, describe, expect, it } from "vitest";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { AuthenticationError } from "../../../common/domain/errors/authentication-error";
import { PatAuthGuard } from "./pat.guard";
import type { PatUser } from "../../application/pat.service";
import { PatService } from "../../application/pat.service";
import type { TokenStore } from "../../application/ports/token-store";
import { tokenSecrets } from "../token-secrets";

interface PatGuardTestHeaders {
  authorization?: string;
}

interface PatGuardTestRequest {
  headers: PatGuardTestHeaders;
  user?: PatUser;
}

const createContext = (headers: PatGuardTestHeaders = {}) => {
  const request: PatGuardTestRequest = { headers };

  return new ExecutionContextHost([request]);
};

describe(PatAuthGuard, () => {
  let guard: PatAuthGuard;

  const RAW_TOKEN = "sarpbc_pat_valid";
  const owner = { email: "a@b.com", id: "user-1", role: "admin" } as const;

  const store: TokenStore = {
    create: async () => {
      throw new Error("unused");
    },
    findActive: async (hash) =>
      hash === tokenSecrets.hash(RAW_TOKEN) ? { id: "token-1", lastUsedAt: null, owner } : null,
    listActive: async () => [],
    revokeOwned: async () => false,
    touch: async () => {},
  };

  const patService = new PatService(store, { findById: async () => null }, tokenSecrets);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatAuthGuard, { provide: PatService, useValue: patService }],
    }).compile();

    guard = module.get(PatAuthGuard);
  });

  it("throws when the authorization header is missing", async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("attaches the resolved user for a valid bearer token", async () => {
    const request: PatGuardTestRequest = {
      headers: { authorization: `Bearer ${RAW_TOKEN}` },
    };

    const context = new ExecutionContextHost([request]);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toStrictEqual({ email: "a@b.com", id: "user-1", role: "admin" });
  });
});
