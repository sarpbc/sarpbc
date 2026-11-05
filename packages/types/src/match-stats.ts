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

export interface StatsPlayerAccount {
  platform: string;
  platformId: string;
  /** In-game name of the most recent game. */
  name: string;
  team: { participantId: string; name: string };
  games: number;
  player: { id: string; name: string } | null;
}

export interface StatsRoster {
  participantId: string;
  teamName: string;
  players: { id: string; name: string }[];
}

export interface StatsPlayerAccounts {
  players: StatsPlayerAccount[];
  rosters: StatsRoster[];
}

export interface TournamentStatsGame {
  matchId: string;
  number: number;
  ballchasingId: string;
  playedAt: string | null;
  blueParticipantId: string;
  orangeParticipantId: string;
  blueGoals: number;
  orangeGoals: number;
}

export interface AttachReplayInput {
  matchId: string;
  /** Ballchasing replay link or id. */
  replay: string;
  gameNumber: number;
  blueParticipantId: string;
}

export interface StatsPlayerLinkInput {
  platform: string;
  platformId: string;
  playerId: string;
}

export interface StatsPlayerLinkResult {
  link: StatsPlayerLinkInput;
  linkedRows: number;
}

export type StatsImportStatus = "pending" | "running" | "completed" | "failed";

export type StatsImportUnmatchedReason =
  | "excluded_by_staff"
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
  | "fetch_failed"
  | "replay_not_ready"
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
      /** Known when the replay was placed on a match. */
      blueParticipantId: string | null;
      reason: StatsImportUnmatchedReason;
    })
  | (StatsImportItemBase & {
      status: "failed";
      matchId: string;
      gameNumber: number;
      blueParticipantId: string;
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
