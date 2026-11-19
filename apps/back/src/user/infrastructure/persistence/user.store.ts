import { EntityManager } from "@mikro-orm/postgresql";
import type { FilterQuery } from "@mikro-orm/postgresql";
import { User as Account } from "../../domain/user";
import type { UserListQuery, UserQueries, UserWriter } from "../../application/ports/user-store";
import { User } from "./user.entity";

const toAccount = (record: User) => {
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
};

export class MikroUserStore implements UserQueries, UserWriter {
  constructor(private readonly em: EntityManager) {}

  private async find(where: FilterQuery<User>) {
    const record = await this.em.findOne(User, where);

    return record ? toAccount(record) : null;
  }

  async list({ search, limit, offset }: UserListQuery) {
    const [records, total] = await this.em.findAndCount(
      User,
      search !== undefined && search !== ""
        ? { $or: [{ email: { $ilike: `%${search}%` } }, { userName: { $ilike: `%${search}%` } }] }
        : {},
      { limit, offset, orderBy: { createdAt: "desc", id: "asc" } },
    );

    return { total, users: records.map(toAccount) };
  }

  async findByEmail(email: string) {
    return await this.find({ email });
  }

  async findById(id: string) {
    return await this.find({ id });
  }

  async findByGoogleId(googleId: string) {
    return await this.find({ googleId });
  }

  async findByEmailWithPassword(email: string) {
    return await this.find({ email, password: { $ne: null } });
  }

  async existsByEmail(email: string) {
    return (await this.em.count(User, { email })) > 0;
  }

  async existsByUserName(userName: string, excludeUserId?: string) {
    return (
      (await this.em.count(
        User,
        excludeUserId !== undefined && excludeUserId !== ""
          ? { id: { $ne: excludeUserId }, userName }
          : { userName },
      )) > 0
    );
  }

  async save(account: Account) {
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
