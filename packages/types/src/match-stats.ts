export interface MatchGamePlayerStats {
  name: string;
  player: { id: string; name: string; slug: string } | null;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  demolitions: number;
}

export interface MatchGameTeamStats {
  participantId: string;
  goals: number;
  players: MatchGamePlayerStats[];
}

export interface MatchGameStats {
  number: number;
  ballchasingId: string;
  playedAt: string | null;
  teams: MatchGameTeamStats[];
}

export type StatsImportStatus = "pending" | "running" | "completed" | "failed";

export type StatsImportUnmatchedReason =
  | "duplicate_replay"
  | "missing_date"
  | "unknown_teams"
  | "outside_match_window"
  | "ambiguous_match"
  | "match_not_finished"
  | "match_has_other_stats"
  | "incomplete_series"
  | "inconsistent_series";

export type StatsImportFailedReason =
  | "download_failed"
  | "parse_failed"
  | "score_mismatch"
  | "player_mismatch"
  | "save_failed";

interface StatsImportItemBase {
  replayId: string;
  title: string;
  playedAt: string | null;
}

export type StatsImportItem =
  | (StatsImportItemBase & {
      status: "imported" | "already_imported";
      matchId: string;
      gameNumber: number;
    })
  | (StatsImportItemBase & {
      status: "unmatched";
      matchId: string | null;
      reason: StatsImportUnmatchedReason;
    })
  | (StatsImportItemBase & {
      status: "failed";
      matchId: string;
      gameNumber: number;
      reason: StatsImportFailedReason;
    });

export interface StatsImport {
  id: string;
  tournamentId: string;
  groupId: string;
  status: StatsImportStatus;
  total: number | null;
  processed: number;
  items: StatsImportItem[];
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
