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
  <section class="w-full flex flex-col gap-3" aria-labelledby="tournament-teams-title">
    <h2 id="tournament-teams-title" class="text-xl font-semibold tracking-tight pl-1 text-balance">
      {{ t("page.tournaments.id.teams.title") }}
    </h2>

    <div v-if="hasTeams" class="flex flex-col gap-px border border-default">
      <article
        v-for="entry in participantEntries"
        :key="entry.team.id"
        class="border-b border-default last:border-b-0 bg-default"
      >
        <div class="flex items-center gap-2 px-2 h-row min-h-row border-b border-default">
          <TeamImg :team-name="entry.team.name" :image-url="entry.team.imageUrl" size="sm" />
          <ULink
            :to="$localePath(`/team/${entry.team.slug}`)"
            class="text-sm font-semibold tracking-tight text-highlighted hover:underline truncate"
          >
            {{ entry.team.name }}
          </ULink>
        </div>

        <div v-if="entry.hasReliableRoster" class="flex flex-col">
          <UiListItem
            v-for="player in entry.players"
            :key="player.id"
            size="compact"
            divider
            :to="$localePath(`/player/${player.slug}`)"
            class="gap-2"
          >
            <FlagIcon :nationality="player.nationality" size="sm" />
            <span class="text-sm font-medium truncate">{{ player.name }}</span>
          </UiListItem>
        </div>
        <p v-else class="px-2 py-3 text-sm text-muted">
          {{ t("page.tournaments.id.participants.rosterEmpty") }}
        </p>
      </article>
    </div>

    <UiCard v-else variant="soft">
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon name="i-fluent-people-team-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.tournaments.id.teams.empty") }}
        </p>
        <p class="text-xs text-dimmed text-pretty">
          {{ t("page.tournaments.id.teams.emptyHint") }}
        </p>
      </div>
    </UiCard>
  </section>
</template>
