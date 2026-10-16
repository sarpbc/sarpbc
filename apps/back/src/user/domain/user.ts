import type { StaffRole } from "./staff-access";

export class User {
  id!: string;
  role: StaffRole | null = null;
  createdAt = new Date();

  constructor(
    public email: string,
    public userName: string,
    public password: string | null = null,
    public googleId: string | null = null,
    public avatarUrl: string | null = null,
  ) {}
}
