<script setup lang="ts">
import { teamPath } from "@sarpbc/utils";
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
  <div class="flex flex-col items-center justify-center">
    <SLink
      v-if="participant?.team.slug"
      :to="$localePath(teamPath(participant.team.slug))"
      variant="muted"
      class="flex max-w-full flex-col items-center justify-center gap-2 text-center text-balance break-words"
      :class="nameClass"
    >
      <TeamImg :team-name="participant.team.name" :logo="participant.team" size="md" />
      {{ participant.team.name }}
    </SLink>
    <span v-else class="block truncate text-center text-muted">{{
      t("page.match.detail.unknownTeam")
    }}</span>
  </div>
</template>
