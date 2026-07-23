import type { StaffPermission, StaffRole } from "../domain/staff-access";

export class UserDto {
  id!: string;
  email!: string;
  userName!: string;
  avatarUrl?: string;
  /** Assigned staff role, when any. */
  role?: StaffRole;
  /** Permissions granted by the role (empty / omitted for members). */
  permissions?: StaffPermission[];
  /** Convenience: true when role is admin (full staff). */
  admin?: boolean;
}
