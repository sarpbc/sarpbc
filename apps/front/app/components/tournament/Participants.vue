<script lang="ts" setup>
import type { Tournament, TournamentParticipant } from "~/types/tournament";
import type { Team } from "~/types/team";

const { tournament } = defineProps<{
  tournament: Tournament;
}>();

const { t } = useI18n();

function getParticipantTeam(participant: TournamentParticipant): Team | null {
  return participant.team ?? null;
}

const teams = computed(() => {
  const participants = tournament.participants ?? [];
  const seen = new Set<string>();
  const result: Team[] = [];

  for (const participant of participants) {
    const team = getParticipantTeam(participant);
    if (!team?.slug || seen.has(team.id)) {
      continue;
    }
    seen.add(team.id);
    result.push(team);
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
});

const hasTeams = computed(() => teams.value.length > 0);
</script>

<template>
  <section class="w-full flex flex-col gap-3" aria-labelledby="tournament-participants-title">
    <h2 id="tournament-participants-title" class="text-xl font-semibold tracking-tight pl-1">
      {{ t("page.tournaments.id.participants.title") }}
    </h2>

    <div v-if="hasTeams" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" role="list">
      <ULink
        v-for="team in teams"
        :key="team.id"
        :to="$localePath(`/team/${team.slug}`)"
        class="flex items-center gap-2 border border-default p-2 hover:bg-elevated/50 transition-colors min-h-11"
        role="listitem"
      >
        <TeamImg :team-name="team.name" :image-url="team.imageUrl" size="sm" />
        <span class="text-sm font-medium truncate">{{ team.name }}</span>
      </ULink>
    </div>

    <UiCard v-else variant="soft">
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon name="i-fluent-people-team-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted">
          {{ t("page.tournaments.id.participants.empty") }}
        </p>
        <p class="text-xs text-dimmed">
          {{ t("page.tournaments.id.participants.emptyHint") }}
        </p>
      </div>
    </UiCard>
  </section>
</template>
