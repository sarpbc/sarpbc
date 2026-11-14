import { defineEntity, p } from "@mikro-orm/core";
import type { StaffRole } from "@sarpbc/types";

export class User {
  id!: string;
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
  indexes: [{ properties: ["email"] }],
  properties: {
    avatarUrl: p.string().nullable(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    email: p.string(),
    googleId: p.string().nullable().hidden(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    password: p.string().nullable().hidden(),
    role: p.string().nullable().hidden(),
    userName: p.string(),
  },
});
