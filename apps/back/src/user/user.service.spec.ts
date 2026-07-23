import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { UserService } from "./user.service";
import { USER_REPOSITORY } from "./domain/user.repository.interface";
import { User } from "./domain/user.entity";

describe("UserService", () => {
  let service: UserService;
  const userRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByGoogleId: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: USER_REPOSITORY, useValue: userRepository }],
    }).compile();

    service = module.get(UserService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("persists a new user without class-validator on the entity", async () => {
      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockImplementation(async (user: User) => {
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
      expect(userRepository.save).toHaveBeenCalled();
    });

    it("throws ConflictException when email already exists", async () => {
      userRepository.existsByEmail.mockResolvedValue(true);

      await expect(
        service.create({
          email: "taken@example.com",
          password: "Password1!",
          userName: "taken",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("linkGoogleAccount", () => {
    it("sets googleId and persists the user", async () => {
      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";

      const linked = await service.linkGoogleAccount(user, "google-123", "https://avatar");

      expect(linked.googleId).toBe("google-123");
      expect(linked.avatarUrl).toBe("https://avatar");
      expect(userRepository.save).toHaveBeenCalledWith(user);
    });

    it("does not overwrite an existing avatarUrl", async () => {
      const user = new User("a@b.com", "alice", "hash", null, "https://existing");
      user.id = "user-1";

      await service.linkGoogleAccount(user, "google-123", "https://new");

      expect(user.avatarUrl).toBe("https://existing");
    });
  });

  describe("isAdmin", () => {
    it("returns true when the user role is admin", async () => {
      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";
      user.role = "admin";
      userRepository.findById.mockResolvedValue(user);

      await expect(service.isAdmin("user-1")).resolves.toBe(true);
    });

    it("returns false when the user is missing or not admin", async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(service.isAdmin("missing")).resolves.toBe(false);

      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";
      user.role = "journalist";
      userRepository.findById.mockResolvedValue(user);
      await expect(service.isAdmin("user-1")).resolves.toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("resolves permissions from the assigned role", async () => {
      const user = new User("a@b.com", "alice", "hash");
      user.id = "user-1";
      user.role = "journalist";
      userRepository.findById.mockResolvedValue(user);

      await expect(service.hasPermission("user-1", "news.manage")).resolves.toBe(true);
      await expect(service.hasPermission("user-1", "forum.moderate")).resolves.toBe(false);
    });
  });
});
