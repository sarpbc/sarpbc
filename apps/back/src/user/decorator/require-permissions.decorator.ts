import { SetMetadata } from "@nestjs/common";
import { StaffPermission } from "../domain/staff-access";

export const STAFF_PERMISSIONS_KEY = "staffPermissions";

export const RequirePermissions = (...permissions: StaffPermission[]) =>
  SetMetadata(STAFF_PERMISSIONS_KEY, permissions);
