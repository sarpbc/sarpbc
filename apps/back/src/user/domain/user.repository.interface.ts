import { User } from "./user.entity";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  save(user: User): Promise<void>;
}
