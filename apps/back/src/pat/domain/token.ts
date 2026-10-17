import type { StaffRole } from "../../user/domain/staff-access";

export interface StoredToken {
  id: string;
  owner: { id: string; email: string; role: StaffRole | null };
  lastUsedAt: Date | null;
}

export interface TokenSummary {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}
