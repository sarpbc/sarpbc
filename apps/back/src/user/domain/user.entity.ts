import { defineEntity, p } from "@mikro-orm/core";
import { UserRepository } from "../user.repository";

export class User {
  id!: string;
  admin = false;
  email!: string;
  userName!: string;
  password!: string | null;
  avatarUrl: string | null;
  createdAt = new Date();
  googleId: string | null;

  constructor(
    email: string,
    userName: string,
    passwordhash: string | null = null,
    googleId: string | null = null,
    avatarUrl: string | null = null,
  ) {
    this.email = email;
    this.userName = userName;
    this.password = passwordhash;
    this.googleId = googleId;
    this.avatarUrl = avatarUrl;
  }
}

export const UserSchema = defineEntity({
  class: User,
  repository: () => UserRepository,
  indexes: [{ properties: ["email"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    admin: p.boolean().default(false).hidden(),
    email: p.string(),
    userName: p.string(),
    password: p.string().nullable().hidden(),
    avatarUrl: p.string().nullable(),
    createdAt: p.datetime().type("Date").defaultRaw("now()"),
    googleId: p.string().nullable().hidden(),
  },
});
