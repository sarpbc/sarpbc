import type { StaffRole } from "@sarpbc/types";

export interface Author {
  id: string;
  userName: string;
  role?: StaffRole | null;
}
