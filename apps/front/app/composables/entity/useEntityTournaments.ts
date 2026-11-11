import type { MaybeRef } from "vue";
import { getPlayerTournaments } from "~/composables/player/api";
import { getTeamTournaments } from "~/composables/team/api";
import type { EntityEventListItem, EntityKind, EntitySections } from "~/types/entity";
import type { Tournament } from "~/types/tournament";
import { getTournamentStatus } from "~/utils/tournamentStatus";
import { byBeginAtAsc, byEndAtDesc, PAST_ENTRIES_LIMIT } from "./entitySort";

const FETCH_TOURNAMENTS = {
  team: getTeamTournaments,
  player: getPlayerTournaments,
} satisfies Record<EntityKind, (id: string) => Promise<Tournament[]>>;

function wonBy(kind: EntityKind, tournament: Tournament, entityId: string): boolean {
  const winner = tournament.winner instanceof Object ? tournament.winner : undefined;
  switch (kind) {
    case "team": {
      const winnerTeamId = winner?.team instanceof Object ? winner.team.id : undefined;
      return winnerTeamId === entityId;
    }
    case "player":
      return winner?.players?.some((player) => player.id === entityId) ?? false;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function splitTournaments(
  tournaments: Tournament[],
  isWinner: (tournament: Tournament) => boolean,
  now: number,
): EntitySections<EntityEventListItem> {
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

  live.sort(byBeginAtAsc);
  upcoming.sort(byBeginAtAsc);
  past.sort(byEndAtDesc);

  const toItem = (tournament: Tournament): EntityEventListItem => ({
    id: tournament.id,
    name: tournament.name,
    slug: tournament.slug,
    event: tournament.event,
    formatLabel: nonDefaultFormatLabel(tournament.format),
    beginAt: tournament.beginAt ?? null,
    endAt: tournament.endAt ?? null,
    status: getTournamentStatus(tournament, now) ?? "finished",
    isWinner: isWinner(tournament),
  });

  return {
    live: live.map(toItem),
    upcoming: upcoming.map(toItem),
    past: past.slice(0, PAST_ENTRIES_LIMIT).map(toItem),
  };
}

export function useEntityTournaments(kind: EntityKind, entityId: MaybeRef<string | undefined>) {
  const idRef = toRef(entityId);

  const { data, pending, error, refresh } = useAsyncData(
    () => `${kind}-tournaments-${idRef.value ?? "unknown"}`,
    async () => ({
      tournaments: idRef.value ? await FETCH_TOURNAMENTS[kind](idRef.value) : [],
      /** Captured with the fetch so the server and client split events identically on hydration. */
      fetchedAt: Date.now(),
    }),
    {
      watch: [idRef],
      default: () => ({ tournaments: [], fetchedAt: 0 }),
    },
  );

  const sections = computed(() =>
    splitTournaments(
      data.value?.tournaments ?? [],
      (tournament) => wonBy(kind, tournament, idRef.value ?? ""),
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
