import type { StaffRole } from "@sarpbc/types";

export class User {
  id!: string;
  role: StaffRole | null = null;
  createdAt = new Date();
  userName: string;
  password: string | null;
  googleId: string | null;
  avatarUrl: string | null;

  constructor(
    readonly email: string,
    userName: string,
    password: string | null = null,
    googleId: string | null = null,
    avatarUrl: string | null = null,
  ) {
    this.userName = userName;
    this.password = password;
    this.googleId = googleId;
    this.avatarUrl = avatarUrl;
  }
}
