import { SetMetadata } from "@nestjs/common";
import type { StaffPermission } from "@sarpbc/types";

export const STAFF_PERMISSIONS_KEY = "staffPermissions";

export const RequirePermissions = (...permissions: StaffPermission[]) =>
  SetMetadata(STAFF_PERMISSIONS_KEY, permissions);
