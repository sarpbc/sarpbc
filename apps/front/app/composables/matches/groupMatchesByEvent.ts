import { tournamentStagePath } from "@sarpbc/utils";
import type { MatchListItem } from "~/types/matches";
import { tournamentStageLabel } from "~/utils/tournamentStageLabel";

export type MatchEventGroup = {
  key: string;
  displayName: string;
  matchesPath: string;
  matches: MatchListItem[];
};

export function groupMatchesByEvent(matches: MatchListItem[]): MatchEventGroup[] {
  const byStage = new Map<string, MatchEventGroup>();

  for (const match of matches) {
    const { tournament } = match;
    let group = byStage.get(tournament.id);
    if (!group) {
      group = {
        key: tournament.id,
        displayName: tournamentStageLabel(tournament),
        matchesPath: `${tournamentStagePath(tournament.event.slug, tournament.slug)}/matches`,
        matches: [],
      };
      byStage.set(tournament.id, group);
    }
    group.matches.push(match);
  }

  return [...byStage.values()];
}
