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
      {{ $t("page.tournaments.id.bracketEmpty") }}
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

    <template v-else-if="bracketView.format === 'bracket-missing-links'">
      <p class="text-sm text-muted">
        {{ $t("components.tournament.bracket.missingLinks") }}
      </p>
      <section
        v-for="group in bracketView.groupedMatches"
        :key="group.round"
        class="flex flex-col gap-2"
      >
        <h2 class="text-sm font-semibold text-muted">
          {{ group.round }}
        </h2>
        <div class="flex flex-col gap-2">
          <TournamentFlatMatchRow v-for="match in group.matches" :key="match.id" :match="match" />
        </div>
      </section>
    </template>

    <template v-else-if="bracketView.format === 'linked-double-elimination'">
      <TournamentBracketGrid
        v-if="bracketView.doubleEliminationLayout"
        :layout="bracketView.doubleEliminationLayout"
      />
      <div v-if="bracketView.lowerBracketFlatMatches.length" class="flex flex-col gap-2">
        <TournamentFlatMatchRow
          v-for="match in bracketView.lowerBracketFlatMatches"
          :key="match.id"
          :match="match"
        />
      </div>
    </template>

    <template v-else>
      <TournamentBracketGrid v-if="bracketView.upperLayout" :layout="bracketView.upperLayout" />
    </template>
  </div>
</template>
