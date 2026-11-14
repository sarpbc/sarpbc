import type { StatsImportItem, StatsImportStatus } from "@sarpbc/types";
import type { Tournament } from "../../../tournament/infrastructure/competition-persistence";

export class MatchStatsImport {
  id!: string;
  tournament!: Tournament;
  groupId!: string;
  status!: StatsImportStatus;
  total: number | null = null;
  processed = 0;
  items: StatsImportItem[] = [];
  error: string | null = null;
  createdAt = new Date();
  startedAt: Date | null = null;
  finishedAt: Date | null = null;
}
