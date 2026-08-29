import { createHash } from "node:crypto";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { User } from "src/user/domain/user.entity";
import { UserService } from "src/user/user.service";
import { PersonalAccessToken } from "./domain/personal-access-token.entity";
import { PatService } from "./pat.service";

describe("PatService", () => {
  let service: PatService;
  const tokenRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const userService = {
    findById: jest.fn(),
  };
  const em = {
    persist: jest.fn().mockReturnThis(),
    flush: jest.fn(),
  };

  beforeEach(() => {
    service = new PatService(
      tokenRepository as never,
      userService as UserService,
      em as EntityManager,
    );
    jest.clearAllMocks();
    em.persist.mockReturnValue(em);
    em.flush.mockResolvedValue(undefined);
  });

  function makeStaffUser(id = "user-1"): User {
    const user = new User("staff@test.com", "staff", "hash");
    user.id = id;
    user.role = "admin";
    return user;
  }

  describe("createToken", () => {
    it("returns a raw token with sarpbc_pat_ prefix and stores only a hash", async () => {
      const user = makeStaffUser();
      userService.findById.mockResolvedValue(user);
      em.flush.mockImplementationOnce(async () => {
        const token = em.persist.mock.calls[0][0] as PersonalAccessToken;
        token.id = "token-1";
      });

      const result = await service.createToken("user-1", "CI token");

      expect(result.token).toMatch(/^sarpbc_pat_/);
      expect(result.id).toBe("token-1");
      expect(result.name).toBe("CI token");
      expect(result.createdAt).toBeInstanceOf(Date);

      const saved = em.persist.mock.calls[0][0] as PersonalAccessToken;
      expect(saved.tokenHash).toBe(createHash("sha256").update(result.token).digest("hex"));
      expect(saved.tokenHash).not.toBe(result.token);
      expect(em.flush).toHaveBeenCalled();
    });

    it("rejects non-staff users", async () => {
      const user = new User("fan@test.com", "fan", "hash");
      user.id = "user-2";
      user.role = null;
      userService.findById.mockResolvedValue(user);

      await expect(service.createToken("user-2", "Nope")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe("resolveUser", () => {
    it("returns the owner and bumps lastUsedAt for a valid token", async () => {
      const owner = makeStaffUser("owner-1");
      const token = {
        owner,
        lastUsedAt: null,
      } as PersonalAccessToken;
      tokenRepository.findOne.mockResolvedValue(token);

      const raw = "sarpbc_pat_testtoken";
      const result = await service.resolveUser(raw);

      expect(result).toEqual({ id: "owner-1", email: "staff@test.com", role: "admin" });
      expect(tokenRepository.findOne).toHaveBeenCalledWith(
        {
          tokenHash: createHash("sha256").update(raw).digest("hex"),
          revokedAt: null,
        },
        { populate: ["owner"] },
      );
      expect(token.lastUsedAt).toBeInstanceOf(Date);
      expect(em.flush).toHaveBeenCalled();
    });

    it("skips the lastUsedAt write when it was bumped recently", async () => {
      const owner = makeStaffUser("owner-1");
      const recentlyUsed = new Date();
      const token = {
        owner,
        lastUsedAt: recentlyUsed,
      } as PersonalAccessToken;
      tokenRepository.findOne.mockResolvedValue(token);

      const result = await service.resolveUser("sarpbc_pat_testtoken");

      expect(result).not.toBeNull();
      expect(token.lastUsedAt).toBe(recentlyUsed);
      expect(em.flush).not.toHaveBeenCalled();
    });

    it("returns null for unknown tokens", async () => {
      tokenRepository.findOne.mockResolvedValue(null);

      await expect(service.resolveUser("sarpbc_pat_unknown")).resolves.toBeNull();
    });

    it("returns null for revoked tokens", async () => {
      tokenRepository.findOne.mockResolvedValue(null);

      await expect(service.resolveUser("sarpbc_pat_revoked")).resolves.toBeNull();
    });

    it("returns null when the owner is no longer staff", async () => {
      const owner = makeStaffUser("owner-1");
      owner.role = null;
      const token = { owner, lastUsedAt: null } as PersonalAccessToken;
      tokenRepository.findOne.mockResolvedValue(token);

      await expect(service.resolveUser("sarpbc_pat_demoted")).resolves.toBeNull();
      expect(em.flush).not.toHaveBeenCalled();
    });
  });

  describe("revokeToken", () => {
    it("throws NotFound when revoking someone else's token", async () => {
      tokenRepository.findOne.mockResolvedValue(null);

      await expect(service.revokeToken("user-1", "token-9")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("sets revokedAt on the caller's token", async () => {
      const token = { revokedAt: null } as PersonalAccessToken;
      tokenRepository.findOne.mockResolvedValue(token);

      await service.revokeToken("user-1", "token-1");

      expect(token.revokedAt).toBeInstanceOf(Date);
      expect(em.flush).toHaveBeenCalled();
    });
  });
});
