<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import { buildTournamentParticipantEntries } from "~/utils/tournamentParticipants";

const TEASER_TEAM_LIMIT = 6;

const { tournament } = defineProps<{
  tournament: Tournament;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const teamsTabPath = computed(() => localePath(`/tournaments/${tournament.id}/teams`));

const participantEntries = computed(() => buildTournamentParticipantEntries(tournament));
const teaserEntries = computed(() => participantEntries.value.slice(0, TEASER_TEAM_LIMIT));
const hasTeams = computed(() => participantEntries.value.length > 0);
const hasMoreTeams = computed(() => participantEntries.value.length > TEASER_TEAM_LIMIT);
</script>

<template>
  <section class="w-full flex flex-col gap-3" aria-labelledby="tournament-participants-title">
    <div class="flex items-center justify-between gap-3 pl-1">
      <h2
        id="tournament-participants-title"
        class="text-xl font-semibold tracking-tight text-balance"
      >
        {{ t("page.tournaments.id.participants.title") }}
      </h2>
      <ULink
        v-if="hasTeams"
        :to="teamsTabPath"
        class="text-sm text-muted hover:text-default shrink-0"
      >
        {{ t("page.tournaments.id.participants.viewAllTeams") }}
      </ULink>
    </div>

    <div
      v-if="hasTeams"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-default"
      role="list"
    >
      <div v-for="entry in teaserEntries" :key="entry.team.id" role="listitem" class="min-w-0">
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

    <div v-if="hasMoreTeams" class="flex justify-center">
      <UButton :to="teamsTabPath" variant="soft" color="neutral">
        {{ t("page.tournaments.id.participants.viewAllTeamsCount", { count: participantEntries.length }) }}
      </UButton>
    </div>
  </section>
</template>
