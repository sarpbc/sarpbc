import { defineEntity, p } from "@mikro-orm/core";
import { UserRepository } from "../user.repository";
import type { StaffRole } from "./staff-access";

export class User {
  id!: string;
  /** Pre-configured staff role; null = regular member. Permissions come from ROLE_PERMISSIONS. */
  role: StaffRole | null = null;
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
    role: p.string().nullable().hidden(),
    email: p.string(),
    userName: p.string(),
    password: p.string().nullable().hidden(),
    avatarUrl: p.string().nullable(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    googleId: p.string().nullable().hidden(),
  },
});
