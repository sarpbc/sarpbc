import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { User } from "./domain/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { SignInUserDto } from "./dto/signin-user.dto";
import { comparePasswordHash, hashPassword } from "../common/password/password";
import { IUserRepository, USER_REPOSITORY } from "./domain/user.repository.interface";

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
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

  async signIn(dto: SignInUserDto): Promise<User | null> {
    const user = await this.userRepository.findByEmailWithPassword(dto.email);
    if (!user || user.password === null) {
      return null;
    }

    if (!(await comparePasswordHash(dto.password, user.password))) {
      return null;
    }

    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const alreadyExists = await this.userRepository.existsByEmail(dto.email);
    if (alreadyExists) {
      throw new ConflictException(
        "An account with this email already exists. Log in or use a different email.",
      );
    }

    // CreateUserDto is already validated by the global ValidationPipe.
    // Do not class-validator.validate() the MikroORM entity — 0.14+ defaults
    // forbidUnknownValues and rejects undecorated entities (breaks all signups).
    const hash = await hashPassword(dto.password);
    const user = new User(dto.email, dto.userName, hash);

    await this.userRepository.save(user);
    return user;
  }

  async isAdmin(id: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);
    return user?.admin === true;
  }

  async createGoogleUser(
    email: string,
    userName: string,
    googleId: string,
    avatarUrl: string | null | undefined,
  ): Promise<User> {
    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      throw new ConflictException(
        "An account with this email already exists. Log in or link Google from your profile.",
      );
    }

    const user = new User(email, userName, null, googleId, avatarUrl ?? null);

    await this.userRepository.save(user);
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
