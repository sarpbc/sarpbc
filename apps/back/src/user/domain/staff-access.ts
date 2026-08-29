/**
 * Staff access model (SAR-81):
 * - Permissions are what code checks.
 * - Roles are pre-configured permission bundles assigned on the user.
 */

import type {
  StaffPermission as ClientStaffPermission,
  StaffRole as ClientStaffRole,
} from "@sarpbc/types";
import type { ApiErrorBody } from "@sarpbc/utils";

export const STAFF_PERMISSIONS = [
  "news.manage",
  "images.manage",
  "forum.moderate",
  "players.manage",
  "teams.manage",
  "tournaments.manage",
  "pickems.manage",
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export const STAFF_ROLES = ["admin", "moderator", "journalist"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/** Compile-time parity with `@sarpbc/types` (workspace package smoke). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type _StaffPermissionParity = AssertExact<StaffPermission, ClientStaffPermission>;
type _StaffRoleParity = AssertExact<StaffRole, ClientStaffRole>;
const _staffPermissionParity: _StaffPermissionParity = true;
const _staffRoleParity: _StaffRoleParity = true;
void _staffPermissionParity;
void _staffRoleParity;

/** Compile-time link proving `@sarpbc/utils` resolves in the Nest graph. */
export type NestLinkedApiErrorBody = ApiErrorBody;

export const ROLE_PERMISSIONS = {
  admin: STAFF_PERMISSIONS,
  journalist: ["news.manage", "images.manage"],
  moderator: ["forum.moderate"],
} as const satisfies { readonly [Role in StaffRole]: readonly StaffPermission[] };

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return value === "admin" || value === "moderator" || value === "journalist";
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
