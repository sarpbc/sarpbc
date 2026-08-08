<script lang="ts" setup>
import type { Tournament, TournamentParticipant } from "~/types/tournament";
import type { Player } from "~/types/player";
import type { Team } from "~/types/team";

const { tournament } = defineProps<{
  tournament: Tournament;
}>();

const { t } = useI18n();

interface ParticipantEntry {
  team: Team;
  players: Player[];
}

function getParticipantTeam(participant: TournamentParticipant): Team | null {
  return participant.team ?? null;
}

const participantEntries = computed((): ParticipantEntry[] => {
  const participants = tournament.participants ?? [];
  const seen = new Set<string>();
  const result: ParticipantEntry[] = [];

  for (const participant of participants) {
    const team = getParticipantTeam(participant);
    if (!team?.slug || seen.has(team.id)) {
      continue;
    }
    seen.add(team.id);
    const players = (participant.players ?? [])
      .filter((player) => player.slug)
      .sort((a, b) => a.name.localeCompare(b.name));
    result.push({ team, players });
  }

  return result.sort((a, b) => a.team.name.localeCompare(b.team.name));
});

const hasTeams = computed(() => participantEntries.value.length > 0);
</script>

<template>
  <section class="w-full flex flex-col gap-3" aria-labelledby="tournament-participants-title">
    <h2
      id="tournament-participants-title"
      class="text-xl font-semibold tracking-tight pl-1 text-balance"
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
