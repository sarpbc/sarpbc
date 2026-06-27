import type { Match } from "~/types/matches";

export type MatchEventGroup = {
  key: string;
  tournamentId?: string;
  /** league.name + serie + tournament.name (stage), e.g. "RLCS Major Paris 2026 Playoffs" */
  displayName: string;
  matches: Match[];
};

function buildGroupKey(match: Match): string {
  const tournament = match.tournament;
  const leagueKey = tournament?.league?.id ?? "__no_league__";
  const serieKey = tournament?.serie ?? "";
  const stageKey = tournament?.id ?? "__no_stage__";
  return `${leagueKey}::${serieKey}::${stageKey}`;
}

export function buildMatchEventDisplayName(
  tournament: Match["tournament"] | undefined,
  unknownLabel: string,
): string {
  if (!tournament) return unknownLabel;

  const parts = [tournament.league?.name, tournament.serie, tournament.name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" ") : unknownLabel;
}

export function groupMatchesByEvent(matches: Match[], unknownLabel: string): MatchEventGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, MatchEventGroup>();

  for (const match of matches) {
    const key = buildGroupKey(match);
    const tournament = match.tournament;

    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        tournamentId: tournament?.id,
        displayName: buildMatchEventDisplayName(tournament, unknownLabel),
        matches: [],
      });
      order.push(key);
    }

    byKey.get(key)!.matches.push(match);
  }

  return order.map((key) => byKey.get(key)!);
}
