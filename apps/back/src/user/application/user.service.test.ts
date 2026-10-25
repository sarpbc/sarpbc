import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../common/domain/errors";
import { UserService } from "./user.service";
import { passwordHasher } from "../infrastructure/password-hasher";
import { User } from "../domain/user";
import type { UserTransaction } from "./ports/user-store";

describe("UserService", () => {
  let service: UserService;
  const userQueries = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByGoogleId: vi.fn(),
    findByEmailWithPassword: vi.fn(),
  };
  const userWriter = {
    findById: vi.fn(),
    existsByEmail: vi.fn(),
    existsByUserName: vi.fn(),
    save: vi.fn(),
  };
  const transaction: UserTransaction = {
    run: (work) => work({ users: userWriter }),
  };

  beforeEach(async () => {
    service = new UserService(userQueries, transaction, passwordHasher);
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("persists a new user without class-validator on the entity", async () => {
      userWriter.existsByEmail.mockResolvedValue(false);
      userWriter.save.mockImplementation(async (user: User) => {
        user.id = "user-1";
      });

      const created = await service.create({
        email: "new@example.com",
        password: "Password1!",
        userName: "newbie",
      });

      expect(created.email).toBe("new@example.com");
      expect(created.userName).toBe("newbie");
      expect(created.password).toBeTruthy();
      expect(userWriter.save).toHaveBeenCalled();
    });

    it("throws ConflictError when email already exists", async () => {
      userWriter.existsByEmail.mockResolvedValue(true);

      await expect(
        service.create({
          email: "taken@example.com",
          password: "Password1!",
          userName: "taken",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("updateUserName", () => {
    it("updates the username when it is available", async () => {
      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";
      userWriter.findById.mockResolvedValue(user);
      userWriter.existsByUserName.mockResolvedValue(false);

      const updated = await service.updateUserName("user-1", "alice2");

      expect(updated.userName).toBe("alice2");
      expect(userWriter.existsByUserName).toHaveBeenCalledWith("alice2", "user-1");
      expect(userWriter.save).toHaveBeenCalledWith(user);
    });

    it("does not persist when the username is unchanged", async () => {
      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";
      userWriter.findById.mockResolvedValue(user);

      const updated = await service.updateUserName("user-1", "alice");

      expect(updated.userName).toBe("alice");
      expect(userWriter.existsByUserName).not.toHaveBeenCalled();
      expect(userWriter.save).not.toHaveBeenCalled();
    });

    it("throws ConflictError when the username is taken", async () => {
      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";
      userWriter.findById.mockResolvedValue(user);
      userWriter.existsByUserName.mockResolvedValue(true);

      await expect(service.updateUserName("user-1", "taken")).rejects.toBeInstanceOf(ConflictError);
      expect(userWriter.save).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the user is missing", async () => {
      userWriter.findById.mockResolvedValue(null);

      await expect(service.updateUserName("missing", "alice")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("linkGoogleAccount", () => {
    it("sets googleId and persists the user", async () => {
      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";

      const linked = await service.linkGoogleAccount(user, "google-123", "https://avatar");

      expect(linked.googleId).toBe("google-123");
      expect(linked.avatarUrl).toBe("https://avatar");
      expect(userWriter.save).toHaveBeenCalledWith(user);
    });

    it("does not overwrite an existing avatarUrl", async () => {
      const user = new User("a@b.com", "alice", "hash", null, "https://existing");
      user.id = "user-1";

      await service.linkGoogleAccount(user, "google-123", "https://new");

      expect(user.avatarUrl).toBe("https://existing");
    });
  });

  describe("hasAnyPermission", () => {
    it("grants admins the requested staff permissions", async () => {
      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";
      user.role = "admin";
      userQueries.findById.mockResolvedValue(user);

      await expect(
        service.hasAnyPermission("user-1", ["news.manage", "forum.moderate"]),
      ).resolves.toBe(true);
    });

    it("denies access when the user is missing", async () => {
      userQueries.findById.mockResolvedValue(null);
      await expect(service.hasAnyPermission("missing", ["news.manage"])).resolves.toBe(false);
    });

    it("requires at least one permission from the assigned role", async () => {
      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";
      user.role = "journalist";
      userQueries.findById.mockResolvedValue(user);

      await expect(
        service.hasAnyPermission("user-1", ["forum.moderate", "news.manage"]),
      ).resolves.toBe(true);
      await expect(service.hasAnyPermission("user-1", ["forum.moderate"])).resolves.toBe(false);
      await expect(service.hasAnyPermission("user-1", [])).resolves.toBe(false);
    });

    it("denies staff permissions to users without a staff role", async () => {
      const user = new User("a@b.com", "alice", "hash");
      userQueries.findById.mockResolvedValue(user);

      await expect(service.hasAnyPermission("user-1", ["news.manage"])).resolves.toBe(false);
    });
  });
});
