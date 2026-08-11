<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import { buildTournamentParticipantEntries } from "~/utils/tournamentParticipants";

const { tournament } = defineProps<{
  tournament: Tournament;
}>();

const { t } = useI18n();

const participantEntries = computed(() => buildTournamentParticipantEntries(tournament));
const hasTeams = computed(() => participantEntries.value.length > 0);
</script>

<template>
  <section class="w-full flex flex-col gap-px" aria-labelledby="tournament-participants-title">
    <h2
      id="tournament-participants-title"
      class="flex text-sm font-medium text-toned h-10.75 items-end pl-1 text-balance"
    >
      {{ t("page.tournaments.id.participants.title") }}
    </h2>

    <div
      v-if="hasTeams"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-default"
      role="list"
    >
      <div v-for="entry in participantEntries" :key="entry.team.id" role="listitem" class="min-w-0">
        <TournamentParticipantTile :team="entry.team" :players="entry.players" />
      </div>
    </div>

    <UiCard v-else variant="soft">
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon name="i-fluent-people-team-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.tournaments.id.participants.empty") }}
        </p>
        <p class="text-xs text-dimmed text-pretty">
          {{ t("page.tournaments.id.participants.emptyHint") }}
        </p>
      </div>
    </UiCard>
  </section>
</template>
