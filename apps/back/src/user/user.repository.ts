import { EntityRepository } from "@mikro-orm/core";
import { User } from "./domain/user.entity";
import { IUserRepository } from "./domain/user.repository.interface";

export class UserRepository extends EntityRepository<User> implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }

  async findById(id: string): Promise<User | null> {
    return this.findOne({ id });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.findOne({ googleId });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.findOne({ email, password: { $ne: null } } as any);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.count({ email });
    return count > 0;
  }

  async save(user: User): Promise<void> {
    await this.em.persist(user).flush();
  }
}
