import { STAFF_ROLES } from "@sarpbc/types";
import type { StaffRole } from "@sarpbc/types";

export const ASSIGNABLE_ROLES = ["member", ...STAFF_ROLES.toReversed()] as const;

export type AssignableRole = "member" | StaffRole;
