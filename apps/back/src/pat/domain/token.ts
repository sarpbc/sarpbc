import type { StaffRole } from "@sarpbc/types";

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
