import type { User } from "../../domain/user";
import type { UserListQuery, UserQueries, UserTransaction, UserWriter } from "./user-store";

export class MemoryUserStore implements UserQueries, UserWriter {
  readonly saves: User[] = [];
  readonly users: User[];
  readonly transaction: UserTransaction = {
    run: async (work) => await work({ users: this }),
  };

  constructor(users: User[] = []) {
    this.users = [...users];
  }

  async list({ search, limit, offset }: UserListQuery) {
    const needle = search?.toLowerCase() ?? "";

    const matching = this.users.filter(
      ({ email, userName }) =>
        email.toLowerCase().includes(needle) || userName.toLowerCase().includes(needle),
    );

    return await Promise.resolve({
      total: matching.length,
      users: matching.slice(offset, offset + limit),
    });
  }

  async findByEmail(email: string) {
    return await Promise.resolve(this.users.find((user) => user.email === email) ?? null);
  }

  async findByEmailWithPassword(email: string) {
    return await this.findByEmail(email);
  }

  async findById(id: string) {
    return await Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  async findByGoogleId(googleId: string) {
    return await Promise.resolve(this.users.find((user) => user.googleId === googleId) ?? null);
  }

  async existsByEmail(email: string) {
    return (await this.findByEmail(email)) !== null;
  }

  async existsByUserName(userName: string, excludeUserId?: string) {
    return await Promise.resolve(
      this.users.some((user) => user.userName === userName && user.id !== excludeUserId),
    );
  }

  async save(user: User) {
    this.saves.push(user);

    if (!this.users.includes(user)) {
      user.id ||= `user-${this.users.length + 1}`;
      this.users.push(user);
    }

    await Promise.resolve();
  }
}
