import type { User } from "../../domain/user";

export interface UserListQuery {
  search?: string;
  limit: number;
  offset: number;
}

export interface UserQueries {
  list(query: UserListQuery): Promise<{ users: User[]; total: number }>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
}

export interface UserWriter {
  findById(id: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUserName(userName: string, excludeUserId?: string): Promise<boolean>;
  save(user: User): Promise<void>;
}

export interface UserWriteScope {
  users: UserWriter;
}

export interface UserTransaction {
  run<T>(work: (scope: UserWriteScope) => Promise<T>): Promise<T>;
}
