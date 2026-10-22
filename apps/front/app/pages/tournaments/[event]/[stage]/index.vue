<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import { isPickemTournamentActive } from "~/utils/pickems";

const { tournament } = defineProps<{
  tournament: Tournament;
}>();

const showPickemCta = computed(() => isPickemTournamentActive(tournament));
const bracketHeadingId = computed(() => `tournament-bracket-title-${tournament.id}`);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <PickemPromoBanner v-if="showPickemCta" :tournament="tournament" variant="homepage" />
    <section class="w-full" :aria-labelledby="bracketHeadingId">
      <SRail>
        <template #caption>
          <h2 :id="bracketHeadingId">
            {{ $t("page.tournaments.id.bracketTitle") }}
          </h2>
        </template>
        <SCard flush-top class="overflow-x-auto p-2">
          <TournamentBracket :tournament="tournament" />
        </SCard>
      </SRail>
    </section>
    <TournamentParticipants :tournament="tournament" />
  </div>
</template>
