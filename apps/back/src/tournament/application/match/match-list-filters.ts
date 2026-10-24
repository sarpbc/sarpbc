/**
 * Domain mapping (user-facing vs API):
 * - User "tournament" (e.g. RLCS) → `leagueId`
 * - Sub-events (e.g. Spring Major) → `tournamentId` (not exposed on /matches list UI)
 */
export interface MatchListQueryOptions {
  limit?: number;
  offset?: number;
  todayOnly?: boolean;
  /** Sub-tournament (Tournament entity). Reserved for future/admin use. */
  tournamentId?: string;
  /** User-facing tournament (League entity). */
  leagueId?: string;
  /** Excludes start.gg matches, tournaments and teams, whose data may not be redistributed. */
  redistributableOnly?: boolean;
}

export interface MatchListScopeFilters {
  tournamentId?: string;
  leagueId?: string;
  redistributableOnly?: boolean;
}
