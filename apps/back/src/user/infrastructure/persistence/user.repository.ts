import { Injectable } from "@nestjs/common";
import { EntityManager, type FilterQuery } from "@mikro-orm/postgresql";
import { User as Account } from "../../domain/user";
import type { IUserRepository } from "../../application/ports/user.repository";
import { User } from "./user.entity";

export function toAccount(record: User): Account {
  const account = new Account(
    record.email,
    record.userName,
    record.password,
    record.googleId,
    record.avatarUrl,
  );
  account.id = record.id;
  account.role = record.role;
  account.createdAt = record.createdAt;
  return account;
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly em: EntityManager) {}

  private async find(where: FilterQuery<User>): Promise<Account | null> {
    const record = await this.em.findOne(User, where);
    return record ? toAccount(record) : null;
  }

  findByEmail(email: string): Promise<Account | null> {
    return this.find({ email });
  }

  findById(id: string): Promise<Account | null> {
    return this.find({ id });
  }

  findByGoogleId(googleId: string): Promise<Account | null> {
    return this.find({ googleId });
  }

  findByEmailWithPassword(email: string): Promise<Account | null> {
    return this.find({ email, password: { $ne: null } });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return (await this.em.count(User, { email })) > 0;
  }

  async existsByUserName(userName: string, excludeUserId?: string): Promise<boolean> {
    return (
      (await this.em.count(
        User,
        excludeUserId ? { userName, id: { $ne: excludeUserId } } : { userName },
      )) > 0
    );
  }

  async save(account: Account): Promise<void> {
    const record = account.id
      ? await this.em.findOneOrFail(User, { id: account.id })
      : new User(
          account.email,
          account.userName,
          account.password,
          account.googleId,
          account.avatarUrl,
        );
    record.email = account.email;
    record.userName = account.userName;
    record.password = account.password;
    record.googleId = account.googleId;
    record.avatarUrl = account.avatarUrl;
    record.role = account.role;
    record.createdAt = account.createdAt;
    await this.em.persist(record).flush();
    account.id = record.id;
  }
}
