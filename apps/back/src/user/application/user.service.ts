import { ConflictError, ForbiddenError, NotFoundError } from "../../common/domain/errors";
import { User } from "../domain/user";
import type { CreateAccountInput, SignInInput } from "./models/account-input";
import type { PasswordHasher } from "./ports/password-hasher";
import type { UserListQuery, UserQueries, UserTransaction } from "./ports/user-store";
import { roleHasAnyPermission, StaffPermission, StaffRole } from "../domain/staff-access";

export class UserService {
  constructor(
    private readonly users: UserQueries,
    private readonly transaction: UserTransaction,
    private readonly passwords: PasswordHasher,
  ) {}

  async list(query: UserListQuery): Promise<{ users: User[]; total: number }> {
    return this.users.list(query);
  }

  async changeRole(actorId: string, targetId: string, role: StaffRole | null): Promise<User> {
    if (actorId === targetId) {
      throw new ForbiddenError("You cannot change your own role. Ask another admin.");
    }

    return this.transaction.run(async ({ users }) => {
      const user = await users.findById(targetId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      user.role = role;
      await users.save(user);
      return user;
    });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  async findOneByGoogleId(googleId: string): Promise<User | null> {
    return this.users.findByGoogleId(googleId);
  }

  async signIn(dto: SignInInput): Promise<User | null> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user || user.password === null) {
      return null;
    }

    if (!(await this.passwords.compare(dto.password, user.password))) {
      return null;
    }

    return user;
  }

  async create(dto: CreateAccountInput): Promise<User> {
    return this.transaction.run(async ({ users }) => {
      if (await users.existsByEmail(dto.email)) {
        throw new ConflictError(
          "An account with this email already exists. Log in or use a different email.",
        );
      }

      const hash = await this.passwords.hash(dto.password);
      const user = new User(dto.email, dto.userName, hash);
      await users.save(user);
      return user;
    });
  }

  async hasAnyPermission(id: string, permissions: StaffPermission[]): Promise<boolean> {
    const user = await this.users.findById(id);
    if (!user) {
      return false;
    }
    return roleHasAnyPermission(user.role, permissions);
  }

  async createGoogleUser(
    email: string,
    userName: string,
    googleId: string,
    avatarUrl: string | null | undefined,
  ): Promise<User> {
    return this.transaction.run(async ({ users }) => {
      if (await users.existsByEmail(email)) {
        throw new ConflictError(
          "An account with this email already exists. Log in or link Google from your profile.",
        );
      }

      const user = new User(email, userName, null, googleId, avatarUrl ?? null);
      await users.save(user);
      return user;
    });
  }

  async updateUserName(userId: string, userName: string): Promise<User> {
    return this.transaction.run(async ({ users }) => {
      const user = await users.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (user.userName !== userName) {
        if (await users.existsByUserName(userName, userId)) {
          throw new ConflictError("This username is already taken. Choose a different name.");
        }
        user.userName = userName;
        await users.save(user);
      }

      return user;
    });
  }

  async linkGoogleAccount(user: User, googleId: string, avatarUrl: string | null): Promise<User> {
    user.googleId = googleId;
    if (avatarUrl && !user.avatarUrl) {
      user.avatarUrl = avatarUrl;
    }
    await this.transaction.run(({ users }) => users.save(user));
    return user;
  }
}
