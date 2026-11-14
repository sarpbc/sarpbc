import { z } from "zod";
import { STAFF_ROLES } from "@sarpbc/types";

export const CHANGEABLE_ROLES = ["member", ...STAFF_ROLES] as const;

export const ChangeUserRoleDto = z.strictObject({
  role: z.enum(CHANGEABLE_ROLES),
});

export type ChangeUserRoleInput = z.infer<typeof ChangeUserRoleDto>;
