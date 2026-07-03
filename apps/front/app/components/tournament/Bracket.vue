<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import { buildTournamentBracketView } from "~/utils/tournamentBracket";

interface Props {
  tournament: Tournament;
}

const { tournament } = defineProps<Props>();

const bracketView = computed(() => buildTournamentBracketView(tournament));
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <p v-if="!tournament.matches?.length" class="text-sm text-muted">
      {{ $t("page.tournaments.id.noMatches") }}
    </p>

    <template v-else-if="bracketView.format === 'flat-stage'">
      <div class="flex flex-col gap-2">
        <TournamentFlatMatchRow
          v-for="match in bracketView.flatMatches"
          :key="match.id"
          :match="match"
        />
      </div>
    </template>

    <template v-else>
      <section v-if="bracketView.eliminationTree.length" class="flex flex-col gap-3">
        <h2
          v-if="bracketView.format === 'double-elimination'"
          class="text-sm font-semibold text-muted"
        >
          {{ $t("components.tournament.bracket.upperBracket") }}
        </h2>
        <div class="w-full flex flex-col gap-4 overflow-x-auto">
          <TournamentBracketMatch
            v-for="match in bracketView.eliminationTree"
            :key="match.matchId"
            :match="match"
          />
        </div>
      </section>

      <section
        v-if="bracketView.lowerBracketMatches.length"
        class="flex flex-col gap-3 border-t border-default pt-4"
      >
        <h2 class="text-sm font-semibold text-muted">
          {{ $t("components.tournament.bracket.lowerBracket") }}
        </h2>
        <div class="flex flex-col gap-2">
          <TournamentFlatMatchRow
            v-for="match in bracketView.lowerBracketMatches"
            :key="match.id"
            :match="match"
          />
        </div>
      </section>
    </template>
  </div>
</template>
