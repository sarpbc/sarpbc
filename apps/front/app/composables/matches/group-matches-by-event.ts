import { stageMatchesPath, tournamentStageLabel } from "@sarpbc/utils";
import type { MatchListItem } from "@sarpbc/types";
import type { MatchEventGroup } from "~/types/matches";

export function groupMatchesByEvent(matches: MatchListItem[]): MatchEventGroup[] {
  const byStage = new Map<string, MatchEventGroup>();

  for (const match of matches) {
    const { tournament } = match;
    let group = byStage.get(tournament.id);

    if (!group) {
      group = {
        key: tournament.id,
        displayName: tournamentStageLabel(tournament),
        matchesPath: stageMatchesPath(tournament.event.slug, tournament.slug),
        matches: [],
      };
      byStage.set(tournament.id, group);
    }

    group.matches.push(match);
  }

  return [...byStage.values()];
}
