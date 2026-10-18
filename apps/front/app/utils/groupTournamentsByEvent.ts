import type { Tournament } from "~/types/tournament";
import { tournamentEventDisplayName } from "~/utils/tournamentEventDisplayName";

export interface TournamentEventGroup {
  key: string;
  displayName: string;
  logoUrl?: string;
  prizepool?: string;
  type?: string;
  stages: Tournament[];
}

function eventKey(tournament: Tournament): string {
  const serie = tournament.serie?.trim();
  if (!serie) return `stage::${tournament.id}`;
  return `${tournament.league?.id ?? ""}::${serie}`;
}

// Same-day stages start at staggered times (Group B before Group A), so order by day then name.
function stageDay(tournament: Tournament): string {
  return tournament.beginAt ? new Date(tournament.beginAt).toISOString().slice(0, 10) : "";
}

function compareStages(a: Tournament, b: Tournament): number {
  return stageDay(b).localeCompare(stageDay(a)) || a.name.localeCompare(b.name);
}

export function groupTournamentsByEvent(tournaments: Tournament[]): TournamentEventGroup[] {
  const groups = new Map<string, TournamentEventGroup>();

  for (const tournament of tournaments) {
    const key = eventKey(tournament);
    const group = groups.get(key);

    if (!group) {
      groups.set(key, {
        key,
        displayName: tournamentEventDisplayName({
          name: tournament.name,
          leagueName: tournament.league?.name,
          serie: tournament.serie,
        }),
        logoUrl: tournament.imageUrl?.trim() || tournament.league?.imageUrl?.trim() || undefined,
        prizepool: tournament.prizepool || undefined,
        type: tournament.type,
        stages: [tournament],
      });
      continue;
    }

    group.stages.push(tournament);
    // Only the main stage carries the prize pool; its type wins over qualifier stages.
    if (!group.prizepool && tournament.prizepool) {
      group.prizepool = tournament.prizepool;
      group.type = tournament.type;
    }
  }

  return [...groups.values()].map((group) => ({
    ...group,
    stages: group.stages.toSorted(compareStages),
  }));
}
