<script setup lang="ts">
import type { TournamentParticipant } from "~/types/tournament";

const { t } = useI18n();

const { participant, winner } = defineProps<{
  participant: TournamentParticipant | undefined;
  winner: boolean | undefined;
}>();

const nameClass = computed(() => {
  if (winner === undefined) return "font-medium text-highlighted";
  return winner ? "font-medium text-highlighted" : "text-muted";
});
</script>

<template>
  <div v-if="participant?.team.slug" class="flex flex-col items-center justify-center">
    <SLink
      :to="$localePath(`/team/${participant.team.slug}`)"
      variant="muted"
      class="flex max-w-full flex-col items-center justify-center gap-2 text-center text-balance break-words"
      :class="nameClass"
    >
      <TeamImg :team-name="participant.team.name" :logo="participant.team" size="md" />
      {{ participant.team.name }}
    </SLink>
  </div>
  <span v-else class="block truncate text-center text-muted">{{
    t("page.match.detail.unknownTeam")
  }}</span>
</template>
