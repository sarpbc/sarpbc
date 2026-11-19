import { STAFF_PERMISSIONS, STAFF_ROLES } from "@sarpbc/types";
import type { StaffPermission, StaffRole } from "@sarpbc/types";

const ROLE_PERMISSIONS = {
  admin: STAFF_PERMISSIONS,
  journalist: ["news.manage", "images.manage"],
  moderator: ["forum.moderate"],
} as const satisfies Readonly<Record<StaffRole, readonly StaffPermission[]>>;

export const isStaffRole = (value: string | null | undefined): value is StaffRole =>
  STAFF_ROLES.some((role) => role === value);

export const permissionsForRole = (role: StaffRole | null | undefined) => {
  const permissions: readonly StaffPermission[] = isStaffRole(role) ? ROLE_PERMISSIONS[role] : [];

  return permissions satisfies readonly StaffPermission[];
};

export const roleHasPermission = (
  role: StaffRole | null | undefined,
  permission: StaffPermission,
) => permissionsForRole(role).includes(permission);

export const roleHasAnyPermission = (
  role: StaffRole | null | undefined,
  permissions: readonly StaffPermission[],
) => {
  const granted = permissionsForRole(role);

  return permissions.some((permission) => granted.includes(permission));
};
