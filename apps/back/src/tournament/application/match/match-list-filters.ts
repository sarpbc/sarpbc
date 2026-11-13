export type MatchListKind = "upcoming" | "live" | "results";

export interface MatchListScopeFilters {
  tournamentId?: string;
  /** User-facing tournament (League entity). */
  leagueId?: string;
  teamId?: string;
  playerIds?: string[];
  /** Excludes start.gg matches and tournaments, whose data may not be redistributed. */
  redistributableOnly?: boolean;
}

export interface MatchListQueryOptions extends MatchListScopeFilters {
  limit?: number;
  offset?: number;
  todayOnly?: boolean;
  liveSince?: Date;
}
