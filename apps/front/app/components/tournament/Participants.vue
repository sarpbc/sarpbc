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
    <h2
      id="tournament-participants-title"
      class="text-xl font-semibold tracking-tight pl-1 text-balance"
    >
      {{ t("page.tournaments.id.participants.title") }}
    </h2>

    <div v-if="hasTeams" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" role="list">
      <UiListItem
        v-for="team in teams"
        :key="team.id"
        size="default"
        :to="$localePath(`/team/${team.slug}`)"
        class="gap-2 border border-default active:scale-[0.96] touch-manipulation transition-[colors,transform]"
        role="listitem"
      >
        <TeamImg :team-name="team.name" :image-url="team.imageUrl" size="sm" />
        <span class="text-sm font-medium truncate">{{ team.name }}</span>
      </UiListItem>
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
