<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";

const { tournament } = defineProps<{
  tournament: Tournament;
}>();

const { formatTournamentPrizepool } = useCurrency();
</script>

<template>
  <ULink
    :to="$localePath(`/tournaments/${tournament.id}`)"
    class="block group rounded-none border border-default p-2 not-first:-mt-px"
  >
    <div
      v-if="tournament.tier === 's' && tournament.league?.imageUrl"
      class="w-full grid grid-cols-5 items-center"
    >
      <img
        class="w-full max-w-64 col-span-2"
        :src="tournament.league.imageUrl"
        :alt="tournament.league?.name ?? tournament.name"
      />
      <div class="flex flex-col col-span-3">
        <h3 class="truncate text-2xl font-semibold">
          {{ tournament.league?.name }}
          {{ tournament.name }}
        </h3>
        <div class="w-full flex flex-row gap-4">
          <h3 class="col-span-2 truncate">
            {{ `${tournament.participants?.length} ${$t("general.teams").toLocaleLowerCase()}` }}
          </h3>
          <h3 class="col-span-2 truncate">
            {{
              formatTournamentPrizepool(tournament.prizepool) ||
              $t("components.tournaments.prizepoolOther")
            }}
          </h3>
          <h3 class="col-span-1 truncate">
            {{ $t(`components.tournaments.${tournament.type}`) }}
          </h3>
        </div>
      </div>
    </div>
    <div v-else class="w-full grid grid-cols-10 items-center">
      <h3 class="flex col-span-5 items-center truncate">
        {{ tournament.league?.name }}
        {{ tournament.name }}
      </h3>
      <h3 class="col-span-2 truncate">
        {{ `${tournament.participants?.length} ${$t("general.teams").toLocaleLowerCase()}` }}
      </h3>
      <h3 class="col-span-2 truncate">
        {{
          formatTournamentPrizepool(tournament.prizepool) ||
          $t("components.tournaments.prizepoolOther")
        }}
      </h3>
      <h3 class="col-span-1 truncate">
        {{ $t(`components.tournaments.${tournament.type}`) }}
      </h3>
    </div>
  </ULink>
</template>
