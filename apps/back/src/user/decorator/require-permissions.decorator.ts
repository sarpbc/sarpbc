import { SetMetadata } from "@nestjs/common";
import { StaffPermission } from "../domain/staff-access";

export const STAFF_PERMISSIONS_KEY = "staffPermissions";

/** Require any of the listed permissions (resolved via the user's role). */
export const RequirePermissions = (...permissions: StaffPermission[]) =>
  SetMetadata(STAFF_PERMISSIONS_KEY, permissions);
