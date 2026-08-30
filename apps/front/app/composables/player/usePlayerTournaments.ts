import type { MaybeRef } from "vue";
import type { Tournament } from "~/types/tournament";
import { getTournamentStatus, type TournamentStatus } from "~/utils/tournamentStatus";

const PAST_EVENTS_LIMIT = 10;

interface PlayerTournamentsPayload {
  tournaments: Tournament[];
  fetchedAt: number;
}

export interface PlayerEventListItem {
  id: string;
  name: string;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  leagueName?: string;
  serie?: string | null;
  status: TournamentStatus;
  isWinner: boolean;
}

export interface PlayerTournamentSections {
  live: PlayerEventListItem[];
  upcoming: PlayerEventListItem[];
  past: PlayerEventListItem[];
}

function timeOf(value: Date | string | null | undefined): number {
  return value ? new Date(value).getTime() : 0;
}

function playerWonTournament(tournament: Tournament, playerId: string): boolean {
  const winner = tournament.winner instanceof Object ? tournament.winner : undefined;
  if (!winner?.players) {
    return false;
  }
  return winner.players.some((player) => player.id === playerId);
}

function toEventListItem(
  tournament: Tournament,
  playerId: string,
  now: number,
): PlayerEventListItem {
  const league = tournament.league instanceof Object ? tournament.league : undefined;
  const status = getTournamentStatus(tournament, now);

  return {
    id: tournament.id,
    name: tournament.name,
    beginAt: tournament.beginAt ?? null,
    endAt: tournament.endAt ?? null,
    leagueName: league?.name,
    serie: tournament.serie ?? null,
    status: status ?? "finished",
    isWinner: playerWonTournament(tournament, playerId),
  };
}

export function splitPlayerTournaments(
  tournaments: Tournament[],
  playerId: string,
  now: number,
): PlayerTournamentSections {
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

  const mapItem = (tournament: Tournament) => toEventListItem(tournament, playerId, now);

  return {
    live: live.map(mapItem),
    upcoming: upcoming.map(mapItem),
    past: past.slice(0, PAST_EVENTS_LIMIT).map(mapItem),
  };
}

export function usePlayerTournaments(playerId: MaybeRef<string | undefined>) {
  const playerIdRef = toRef(playerId);

  const { data, pending, error, refresh } = useAsyncData<PlayerTournamentsPayload>(
    () => `player-tournaments-${playerIdRef.value ?? "unknown"}`,
    async () => ({
      tournaments: playerIdRef.value ? await getPlayerTournaments(playerIdRef.value) : [],
      fetchedAt: Date.now(),
    }),
    {
      watch: [playerIdRef],
      default: () => ({ tournaments: [], fetchedAt: 0 }),
    },
  );

  const sections = computed(() =>
    splitPlayerTournaments(
      data.value?.tournaments ?? [],
      playerIdRef.value ?? "",
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
