/**
 * Staff access model:
 * - Permissions are what code checks.
 * - Roles are pre-configured permission bundles assigned on the user.
 */

import { STAFF_PERMISSIONS, STAFF_ROLES } from "@sarpbc/types";
import type { StaffPermission, StaffRole } from "@sarpbc/types";

export const ROLE_PERMISSIONS = {
  admin: STAFF_PERMISSIONS,
  journalist: ["news.manage", "images.manage"],
  moderator: ["forum.moderate"],
} as const satisfies Readonly<Record<StaffRole, readonly StaffPermission[]>>;

export const isStaffRole = (value: string | null | undefined): value is StaffRole =>
  STAFF_ROLES.some((role) => role === value);

export const permissionsForRole = (
  role: StaffRole | null | undefined,
): readonly StaffPermission[] => {
  if (!isStaffRole(role)) {
    return [];
  }

  return ROLE_PERMISSIONS[role];
};

export const roleHasPermission = (
  role: StaffRole | null | undefined,
  permission: StaffPermission,
): boolean => permissionsForRole(role).includes(permission);

export const roleHasAnyPermission = (
  role: StaffRole | null | undefined,
  permissions: readonly StaffPermission[],
): boolean => {
  const granted = permissionsForRole(role);

  return permissions.some((permission) => granted.includes(permission));
};
