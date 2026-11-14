/**
 * Staff access model:
 * - Permissions are what code checks.
 * - Roles are pre-configured permission bundles assigned on the user.
 */

import {
  STAFF_PERMISSIONS,
  STAFF_ROLES,
  type StaffPermission,
  type StaffRole,
} from "@sarpbc/types";

export const ROLE_PERMISSIONS = {
  admin: STAFF_PERMISSIONS,
  journalist: ["news.manage", "images.manage"],
  moderator: ["forum.moderate"],
} as const satisfies Readonly<Record<StaffRole, readonly StaffPermission[]>>;

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return STAFF_ROLES.some((role) => role === value);
}

export function permissionsForRole(role: StaffRole | null | undefined): readonly StaffPermission[] {
  if (!isStaffRole(role)) {
    return [];
  }

  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(
  role: StaffRole | null | undefined,
  permission: StaffPermission,
): boolean {
  return permissionsForRole(role).includes(permission);
}

export function roleHasAnyPermission(
  role: StaffRole | null | undefined,
  permissions: readonly StaffPermission[],
): boolean {
  const granted = permissionsForRole(role);

  return permissions.some((permission) => granted.includes(permission));
}
