import { isNonEmptyString } from "@sarpbc/utils";
import type { MaybeRef } from "vue";
import { getPlayerTournaments } from "~/composables/player/api";
import { getTeamTournaments } from "~/composables/team/api";
import type { EntityEventListItem, EntityKind } from "~/types/entity";
import type { Tournament } from "~/types/tournament";
import { getTournamentStatus } from "~/utils/tournament-status";
import { byBeginAtAsc, byEndAtDesc, PAST_ENTRIES_LIMIT } from "./entity-sort";

const FETCH_TOURNAMENTS = {
  player: getPlayerTournaments,
  team: getTeamTournaments,
} satisfies Record<EntityKind, (id: string) => Promise<Tournament[]>>;

const wonBy = (kind: EntityKind, tournament: Tournament, entityId: string) => {
  const winner = tournament.winner instanceof Object ? tournament.winner : undefined;

  switch (kind) {
    case "team": {
      const winnerTeamId = winner?.team instanceof Object ? winner.team.id : undefined;

      return winnerTeamId === entityId;
    }

    case "player": {
      return winner?.players?.some((player) => player.id === entityId) ?? false;
    }

    default: {
      const exhaustive: never = kind;

      return exhaustive;
    }
  }
};

export const splitTournaments = (
  tournaments: Tournament[],
  isWinner: (tournament: Tournament) => boolean,
  now: number,
) => {
  const live: Tournament[] = [];
  const upcoming: Tournament[] = [];
  const past: Tournament[] = [];

  for (const tournament of tournaments) {
    const status = getTournamentStatus(tournament, now);

    if (status === null) {
      continue;
    }

    switch (status) {
      case "live": {
        live.push(tournament);
        break;
      }

      case "upcoming": {
        upcoming.push(tournament);
        break;
      }

      case "finished": {
        past.push(tournament);
        break;
      }

      default: {
        const exhaustive: never = status;

        return exhaustive;
      }
    }
  }

  live.sort(byBeginAtAsc);
  upcoming.sort(byBeginAtAsc);
  past.sort(byEndAtDesc);

  const toItem = (tournament: Tournament) =>
    ({
      beginAt: tournament.beginAt ?? null,
      endAt: tournament.endAt ?? null,
      event: tournament.event,
      formatLabel: nonDefaultFormatLabel(tournament.format),
      id: tournament.id,
      isWinner: isWinner(tournament),
      name: tournament.name,
      slug: tournament.slug,
      status: getTournamentStatus(tournament, now) ?? "finished",
    }) satisfies EntityEventListItem;

  return {
    live: live.map(toItem),
    past: past.slice(0, PAST_ENTRIES_LIMIT).map(toItem),
    upcoming: upcoming.map(toItem),
  };
};

export const useEntityTournaments = (kind: EntityKind, entityId: MaybeRef<string | undefined>) => {
  const idRef = toRef(entityId);

  const { data, pending, error, refresh } = useAsyncData(
    () => `${kind}-tournaments-${idRef.value ?? "unknown"}`,
    async () => ({
      // WARNING: fetchedAt is captured with the fetch so server and client build identical results on hydration.
      fetchedAt: Date.now(),
      tournaments: isNonEmptyString(idRef.value) ? await FETCH_TOURNAMENTS[kind](idRef.value) : [],
    }),
    {
      default: () => ({ fetchedAt: 0, tournaments: [] }),
      watch: [idRef],
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
    error,
    live: computed(() => sections.value.live),
    past: computed(() => sections.value.past),
    pending,
    refresh,
    upcoming: computed(() => sections.value.upcoming),
  };
};
