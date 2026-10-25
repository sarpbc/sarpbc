import { z } from "zod";
import { STAFF_ROLES } from "../../../domain/staff-access";

export const CHANGEABLE_ROLES = ["member", ...STAFF_ROLES] as const;

export const ChangeUserRoleDto = z.strictObject({
  role: z.enum(CHANGEABLE_ROLES),
});

export type ChangeUserRoleDto = z.infer<typeof ChangeUserRoleDto>;
