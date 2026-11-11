<script lang="ts" setup>
import type { TournamentDetail } from "@sarpbc/types";
import { isPickemTournamentActive } from "~/utils/pickems";

const { tournament } = defineProps<{
  tournament: TournamentDetail;
}>();

const showPickemCta = computed(() => isPickemTournamentActive(tournament));
const bracketHeadingId = computed(() => `tournament-bracket-title-${tournament.id}`);
const watchHeadingId = computed(() => `tournament-watch-title-${tournament.id}`);
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
        <SCard class="overflow-x-auto p-2">
          <TournamentBracket :tournament="tournament" />
        </SCard>
      </SRail>
    </section>
    <section
      v-if="tournament.watchStreams.length > 0"
      class="w-full"
      :aria-labelledby="watchHeadingId"
    >
      <SRail>
        <template #caption>
          <h2 :id="watchHeadingId">
            {{ $t("page.match.detail.sections.watch") }}
          </h2>
        </template>
        <StreamList :streams="tournament.watchStreams" />
      </SRail>
    </section>
    <TournamentParticipants :tournament="tournament" />
    <TournamentPrizes :tournament="tournament" />
  </div>
</template>
