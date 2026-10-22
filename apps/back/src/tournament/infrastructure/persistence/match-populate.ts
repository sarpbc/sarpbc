/** Relations of a match row that toTournamentSummary and toMatchSlug read. */
export const MATCH_TOURNAMENT_POPULATE = ["tournament.league", "tournament.event"] as const;
