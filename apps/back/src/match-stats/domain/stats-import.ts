import type { StatsImportItem, StatsImportStatus } from "@sarpbc/types";

export interface StatsImport {
  id: string;
  tournamentId: string;
  groupId: string;
  status: StatsImportStatus;
  total: number | null;
  processed: number;
  items: StatsImportItem[];
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export const ACTIVE_IMPORT_STATUSES: readonly StatsImportStatus[] = ["pending", "running"];

export function isActive(statsImport: Pick<StatsImport, "status">): boolean {
  return ACTIVE_IMPORT_STATUSES.includes(statsImport.status);
}
