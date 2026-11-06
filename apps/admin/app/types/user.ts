import { STAFF_ROLES, type StaffRole } from "@sarpbc/types";

export const ASSIGNABLE_ROLES = ["member", ...[...STAFF_ROLES].reverse()] as const;

export type AssignableRole = "member" | StaffRole;
