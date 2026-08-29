import type { MaybeRef } from "vue";
import type { Tournament } from "~/types/tournament";
import { getTournamentStatus, type TournamentStatus } from "~/utils/tournamentStatus";

const PAST_EVENTS_LIMIT = 10;

interface TeamTournamentsPayload {
  tournaments: Tournament[];
  /** Captured with the fetch so the server and client split events identically on hydration. */
  fetchedAt: number;
}

export interface TeamEventListItem {
  id: string;
  name: string;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  leagueName?: string;
  serie?: string | null;
  status: TournamentStatus;
  isWinner: boolean;
}

export interface TeamTournamentSections {
  live: TeamEventListItem[];
  upcoming: TeamEventListItem[];
  past: TeamEventListItem[];
}

function timeOf(value: Date | string | null | undefined): number {
  return value ? new Date(value).getTime() : 0;
}

function toEventListItem(tournament: Tournament, teamId: string, now: number): TeamEventListItem {
  const league = tournament.league instanceof Object ? tournament.league : undefined;
  const winner = tournament.winner instanceof Object ? tournament.winner : undefined;
  const winnerTeamId = winner?.team instanceof Object ? winner.team.id : undefined;
  const status = getTournamentStatus(tournament, now);

  return {
    id: tournament.id,
    name: tournament.name,
    beginAt: tournament.beginAt ?? null,
    endAt: tournament.endAt ?? null,
    leagueName: league?.name,
    serie: tournament.serie ?? null,
    status: status ?? "finished",
    isWinner: winnerTeamId === teamId,
  };
}

export function splitTeamTournaments(
  tournaments: Tournament[],
  teamId: string,
  now: number,
): TeamTournamentSections {
  const live: Tournament[] = [];
  const upcoming: Tournament[] = [];
  const past: Tournament[] = [];

  for (const tournament of tournaments) {
    const status = getTournamentStatus(tournament, now);
    if (status === null) {
      continue;
    }

    switch (status) {
      case "live":
        live.push(tournament);
        break;
      case "upcoming":
        upcoming.push(tournament);
        break;
      case "finished":
        past.push(tournament);
        break;
      default: {
        const exhaustive: never = status;
        return exhaustive;
      }
    }
  }

  const byBeginAtAsc = (a: Tournament, b: Tournament) => timeOf(a.beginAt) - timeOf(b.beginAt);
  const byEndAtDesc = (a: Tournament, b: Tournament) =>
    (timeOf(b.endAt) || timeOf(b.beginAt)) - (timeOf(a.endAt) || timeOf(a.beginAt));

  live.sort(byBeginAtAsc);
  upcoming.sort(byBeginAtAsc);
  past.sort(byEndAtDesc);

  const mapItem = (tournament: Tournament) => toEventListItem(tournament, teamId, now);

  return {
    live: live.map(mapItem),
    upcoming: upcoming.map(mapItem),
    past: past.slice(0, PAST_EVENTS_LIMIT).map(mapItem),
  };
}

export function useTeamTournaments(teamId: MaybeRef<string | undefined>) {
  const teamIdRef = toRef(teamId);

  const { data, pending, error, refresh } = useAsyncData<TeamTournamentsPayload>(
    () => `team-tournaments-${teamIdRef.value ?? "unknown"}`,
    async () => ({
      tournaments: teamIdRef.value ? await getTeamTournaments(teamIdRef.value) : [],
      fetchedAt: Date.now(),
    }),
    {
      watch: [teamIdRef],
      default: () => ({ tournaments: [], fetchedAt: 0 }),
    },
  );

  const sections = computed(() =>
    splitTeamTournaments(
      data.value?.tournaments ?? [],
      teamIdRef.value ?? "",
      data.value?.fetchedAt ?? 0,
    ),
  );

  return {
    live: computed(() => sections.value.live),
    upcoming: computed(() => sections.value.upcoming),
    past: computed(() => sections.value.past),
    pending,
    error,
    refresh,
  };
}
