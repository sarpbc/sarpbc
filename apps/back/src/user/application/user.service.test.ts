import { describe, expect, it } from "vitest";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { ForbiddenError } from "../../common/domain/errors/forbidden-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { UserService } from "./user.service";
import type { PasswordHasher } from "./ports/password-hasher";
import { User } from "../domain/user";
import { MemoryUserStore } from "./ports/user-store.test-utils";

const passwords: PasswordHasher = {
  compare: async (password, hash) => hash === `hashed:${password}`,
  hash: async (password) => `hashed:${password}`,
};

const alice = (overrides: Partial<User> = {}) =>
  Object.assign(new User("a@b.com", "alice", "hash"), { id: "user-1" }, overrides);

const serviceOver = (...users: User[]) => {
  const store = new MemoryUserStore(users);

  return { service: new UserService(store, store.transaction, passwords), store };
};

describe(UserService, () => {
  describe("create", () => {
    it("persists a new user with a hashed password", async () => {
      const { service, store } = serviceOver();

      const created = await service.create({
        email: "new@example.com",
        password: "Password1!",
        userName: "newbie",
      });

      expect(created.email).toBe("new@example.com");
      expect(created.userName).toBe("newbie");
      expect(created.password).toBe("hashed:Password1!");
      expect(store.users).toStrictEqual([created]);
    });

    it("throws ConflictError when email already exists", async () => {
      const { service } = serviceOver(new User("taken@example.com", "other", "hash"));

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
      const user = alice();
      const { service, store } = serviceOver(user);

      const updated = await service.updateUserName("user-1", "alice2");

      expect(updated.userName).toBe("alice2");
      expect(store.saves).toStrictEqual([user]);
    });

    it("does not persist when the username is unchanged", async () => {
      const { service, store } = serviceOver(alice());

      const updated = await service.updateUserName("user-1", "alice");

      expect(updated.userName).toBe("alice");
      expect(store.saves).toStrictEqual([]);
    });

    it("throws ConflictError when the username is taken", async () => {
      const { service, store } = serviceOver(
        alice(),
        Object.assign(new User("b@b.com", "taken"), { id: "user-2" }),
      );

      await expect(service.updateUserName("user-1", "taken")).rejects.toBeInstanceOf(ConflictError);
      expect(store.saves).toStrictEqual([]);
    });

    it("throws NotFoundError when the user is missing", async () => {
      const { service } = serviceOver();

      await expect(service.updateUserName("missing", "alice")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("linkGoogleAccount", () => {
    it("sets googleId and persists the user", async () => {
      const user = alice();
      const { service, store } = serviceOver(user);

      const linked = await service.linkGoogleAccount(user, "google-123", "https://avatar");

      expect(linked.googleId).toBe("google-123");
      expect(linked.avatarUrl).toBe("https://avatar");
      expect(store.saves).toStrictEqual([user]);
    });

    it("does not overwrite an existing avatarUrl", async () => {
      const user = alice({ avatarUrl: "https://existing" });
      const { service } = serviceOver(user);

      await service.linkGoogleAccount(user, "google-123", "https://new");

      expect(user.avatarUrl).toBe("https://existing");
    });
  });

  describe("hasAnyPermission", () => {
    it("grants admins the requested staff permissions", async () => {
      const { service } = serviceOver(alice({ role: "admin" }));

      await expect(
        service.hasAnyPermission("user-1", ["news.manage", "forum.moderate"]),
      ).resolves.toBe(true);
    });

    it("denies access when the user is missing", async () => {
      const { service } = serviceOver();

      await expect(service.hasAnyPermission("missing", ["news.manage"])).resolves.toBe(false);
    });

    it("requires at least one permission from the assigned role", async () => {
      const { service } = serviceOver(alice({ role: "journalist" }));

      await expect(
        service.hasAnyPermission("user-1", ["forum.moderate", "news.manage"]),
      ).resolves.toBe(true);
      await expect(service.hasAnyPermission("user-1", ["forum.moderate"])).resolves.toBe(false);
      await expect(service.hasAnyPermission("user-1", [])).resolves.toBe(false);
    });

    it("denies staff permissions to users without a staff role", async () => {
      const { service } = serviceOver(alice());

      await expect(service.hasAnyPermission("user-1", ["news.manage"])).resolves.toBe(false);
    });
  });

  describe("changeRole", () => {
    it("forbids changing your own role", async () => {
      const { service, store } = serviceOver(alice());

      await expect(service.changeRole("user-1", "user-1", "admin")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(store.saves).toStrictEqual([]);
    });

    it("throws NotFoundError when the target does not exist", async () => {
      const { service, store } = serviceOver();

      await expect(service.changeRole("admin-1", "missing", "moderator")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(store.saves).toStrictEqual([]);
    });

    it("assigns a staff role", async () => {
      const user = alice();
      const { service, store } = serviceOver(user);

      const updated = await service.changeRole("admin-1", "user-1", "journalist");

      expect(updated.role).toBe("journalist");
      expect(store.saves).toStrictEqual([user]);
    });

    it("clears the role when demoting to member", async () => {
      const user = alice({ role: "moderator" });
      const { service, store } = serviceOver(user);

      const updated = await service.changeRole("admin-1", "user-1", null);

      expect(updated.role).toBeNull();
      expect(store.saves).toStrictEqual([user]);
    });
  });
});
