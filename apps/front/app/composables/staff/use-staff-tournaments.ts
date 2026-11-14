import type { MaybeRef } from "vue";
import type { PlayerContract } from "@sarpbc/types";
import { getPlayerStaffTournaments } from "~/composables/player/api";
import type { Tournament } from "~/types/tournament";
import { splitTournaments } from "~/composables/entity/use-entity-tournaments";

const coversTournament = (contract: PlayerContract, tournament: Tournament): boolean => {
  if (!tournament.beginAt) {
    return false;
  }

  const beginAt = new Date(tournament.beginAt).getTime();

  return (
    new Date(contract.startDate).getTime() <= beginAt &&
    (contract.endDate === null || beginAt <= new Date(contract.endDate).getTime())
  );
};

const wonDuringTenure = (tournament: Tournament, contracts: PlayerContract[]): boolean => {
  const winner = tournament.winner instanceof Object ? tournament.winner : undefined;
  const winnerTeamId = winner?.team instanceof Object ? winner.team.id : undefined;

  return contracts.some(
    (contract) => contract.team.id === winnerTeamId && coversTournament(contract, tournament),
  );
};

export const useStaffTournaments = (
  staffId: MaybeRef<string>,
  contracts: MaybeRef<PlayerContract[]>,
) => {
  const idRef = toRef(staffId);
  const contractsRef = toRef(contracts);

  const { data, pending, error, refresh } = useAsyncData(
    () => `staff-tournaments-${idRef.value}`,
    async () => ({
      /** Captured with the fetch so the server and client split events identically on hydration. */
      fetchedAt: Date.now(),
      tournaments: idRef.value ? await getPlayerStaffTournaments(idRef.value) : [],
    }),
    {
      default: () => ({ fetchedAt: 0, tournaments: [] }),
      watch: [idRef],
    },
  );

  const sections = computed(() =>
    splitTournaments(
      data.value?.tournaments ?? [],
      (tournament) => wonDuringTenure(tournament, contractsRef.value),
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
