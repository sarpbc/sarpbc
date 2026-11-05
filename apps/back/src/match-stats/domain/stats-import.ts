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

export function isActive(statsImport: Pick<StatsImport, "status">): boolean {
  return statsImport.status === "pending" || statsImport.status === "running";
}
