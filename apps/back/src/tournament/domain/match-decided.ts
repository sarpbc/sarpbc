export const MATCH_DECIDED = "match.decided";
/**
 * Published after every committed write that leaves the match decided, not only on the transition.
 * PandaScore re-syncs therefore republish it, which retries a failed best-effort handler.
 * Handlers must be idempotent.
 */
export interface MatchDecided {
  type: typeof MATCH_DECIDED;
  matchId: string;
}
export const matchDecided = (matchId: string): MatchDecided => ({ type: MATCH_DECIDED, matchId });
