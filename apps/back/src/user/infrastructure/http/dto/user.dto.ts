import type { StaffPermission, StaffRole } from "../../../domain/staff-access";

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

export class UserListItemDto {
  id!: string;
  email!: string;
  userName!: string;
  avatarUrl!: string | null;
  role!: StaffRole | null;
  createdAt!: string;
}
