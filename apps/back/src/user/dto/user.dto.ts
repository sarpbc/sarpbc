import type { StaffPermission, StaffRole } from "../domain/staff-access";

export class UserDto {
  id!: string;
  email!: string;
  userName!: string;
  avatarUrl?: string;
  role?: StaffRole;
  permissions?: StaffPermission[];
  /** Derived from `role === "admin"`, not a separate assignment. */
  admin?: boolean;
}
