import { createHash } from "node:crypto";
import { ForbiddenError, NotFoundError } from "../../common/domain/errors";
import { User } from "../../user/domain/user";
import { tokenSecrets } from "../infrastructure/token-secrets";
import type { TokenStore } from "./ports/token-store";
import { PatService } from "./pat.service";

describe("PatService", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  let owner: User;
  let revoked: boolean;
  let savedHash: string | null;
  let lastUsedAt: Date | null;
  let service: PatService;
  const touch = jest.fn();

  beforeEach(() => {
    owner = new User("staff@test.com", "staff", "hash");
    owner.id = "owner-1";
    owner.role = "admin";
    revoked = false;
    savedHash = null;
    lastUsedAt = null;
    touch.mockReset();
    const store: TokenStore = {
      create: async (_ownerId, name, hash) => {
        savedHash = hash;
        return { id: "token-1", name, createdAt: now, lastUsedAt: null };
      },
      listActive: async () => [],
      findActive: async (hash) =>
        !revoked && hash === savedHash ? { id: "token-1", owner, lastUsedAt } : null,
      revokeOwned: async (ownerId, id) => {
        if (ownerId !== owner.id || id !== "token-1" || revoked) return false;
        revoked = true;
        return true;
      },
      touch: async (_id, at) => {
        touch(at);
        lastUsedAt = at;
      },
    };
    service = new PatService(
      store,
      { findById: async (id) => (id === owner.id ? owner : null) },
      tokenSecrets,
      () => now,
    );
  });

  it("returns plaintext once and stores only its hash", async () => {
    const created = await service.createToken(owner.id, "CI token");
    expect(created).toMatchObject({ id: "token-1", name: "CI token", createdAt: now });
    expect(created.token).toMatch(/^sarpbc_pat_/);
    expect(savedHash).toBe(createHash("sha256").update(created.token).digest("hex"));
    expect(savedHash).not.toBe(created.token);
  });

  it("rejects nonstaff and missing users", async () => {
    owner.role = null;
    await expect(service.createToken(owner.id, "Nope")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.createToken("missing", "Nope")).rejects.toBeInstanceOf(ForbiddenError);
    expect(savedHash).toBeNull();
  });

  it("resolves the owner and records usage", async () => {
    const token = await service.createToken(owner.id, "CI");
    await expect(service.resolveUser(token.token)).resolves.toEqual({
      id: owner.id,
      email: owner.email,
      role: "admin",
    });
    expect(lastUsedAt).toBe(now);
  });

  it("limits usage writes to once a minute", async () => {
    const token = await service.createToken(owner.id, "CI");
    lastUsedAt = new Date(now.getTime() - 10_000);
    await expect(service.resolveUser(token.token)).resolves.not.toBeNull();
    expect(touch).not.toHaveBeenCalled();
  });

  it("rejects unknown tokens", async () => {
    await expect(service.resolveUser("sarpbc_pat_unknown")).resolves.toBeNull();
  });

  it("rechecks the current staff role on every use", async () => {
    const token = await service.createToken(owner.id, "CI");
    owner.role = null;
    await expect(service.resolveUser(token.token)).resolves.toBeNull();
    expect(touch).not.toHaveBeenCalled();
  });

  it("revokes an owned token", async () => {
    const token = await service.createToken(owner.id, "CI");
    await service.revokeToken(owner.id, token.id);
    await expect(service.resolveUser(token.token)).resolves.toBeNull();
  });

  it("rejects another owner's token and leaves it active", async () => {
    const token = await service.createToken(owner.id, "CI");
    await expect(service.revokeToken("other", token.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.resolveUser(token.token)).resolves.not.toBeNull();
  });
});
