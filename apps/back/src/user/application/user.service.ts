import { ConflictError, NotFoundError } from "../../common/domain/errors";
import { User } from "../domain/user";
import type { CreateAccountInput, SignInInput } from "./models/account-input";
import type { PasswordHasher } from "./ports/password-hasher";
import type { IUserRepository } from "./ports/user.repository";
import { roleHasAnyPermission, StaffPermission } from "../domain/staff-access";

export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findOneByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findByGoogleId(googleId);
  }

  async signIn(dto: SignInInput): Promise<User | null> {
    const user = await this.userRepository.findByEmailWithPassword(dto.email);
    if (!user || user.password === null) {
      return null;
    }

    if (!(await this.passwords.compare(dto.password, user.password))) {
      return null;
    }

    return user;
  }

  async create(dto: CreateAccountInput): Promise<User> {
    const alreadyExists = await this.userRepository.existsByEmail(dto.email);
    if (alreadyExists) {
      throw new ConflictError(
        "An account with this email already exists. Log in or use a different email.",
      );
    }

    const hash = await this.passwords.hash(dto.password);
    const user = new User(dto.email, dto.userName, hash);

    await this.userRepository.save(user);
    return user;
  }

  async hasAnyPermission(id: string, permissions: StaffPermission[]): Promise<boolean> {
    const user = await this.userRepository.findById(id);
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
    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      throw new ConflictError(
        "An account with this email already exists. Log in or link Google from your profile.",
      );
    }

    const user = new User(email, userName, null, googleId, avatarUrl ?? null);

    await this.userRepository.save(user);
    return user;
  }

  async updateUserName(userId: string, userName: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.userName !== userName) {
      const taken = await this.userRepository.existsByUserName(userName, userId);
      if (taken) {
        throw new ConflictError("This username is already taken. Choose a different name.");
      }
      user.userName = userName;
      await this.userRepository.save(user);
    }

    return user;
  }

  async linkGoogleAccount(user: User, googleId: string, avatarUrl: string | null): Promise<User> {
    user.googleId = googleId;
    if (avatarUrl && !user.avatarUrl) {
      user.avatarUrl = avatarUrl;
    }
    await this.userRepository.save(user);
    return user;
  }
}
