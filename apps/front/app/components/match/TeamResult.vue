<script setup lang="ts">
import { participantName, playerPath, teamPath } from "@sarpbc/utils";
import type { TournamentParticipant } from "~/types/tournament";

const { t } = useI18n();

const { participant, winner } = defineProps<{
  participant: TournamentParticipant | undefined;
  winner: boolean | undefined;
}>();

const name = computed(() => (participant ? participantName(participant) : ""));

const href = computed(() => {
  if (participant?.team) {
    return participant.team.slug ? teamPath(participant.team.slug) : null;
  }
  const [player, ...others] = participant?.players ?? [];
  return player && others.length === 0 ? playerPath(player.slug) : null;
});

const nameClass = computed(() => {
  if (winner === undefined) return "font-medium text-highlighted";
  return winner ? "font-medium text-highlighted" : "text-muted";
});
</script>

<template>
  <div class="flex flex-col items-center justify-center">
    <SLink
      v-if="href"
      :to="$localePath(href)"
      variant="muted"
      class="flex max-w-full flex-col items-center justify-center gap-2 text-center text-balance break-words"
      :class="nameClass"
    >
      <TeamImg :team-name="name" :logo="participant?.team" size="md" />
      {{ name }}
    </SLink>
    <span
      v-else-if="participant && !participant.team && name"
      class="flex max-w-full flex-col items-center justify-center gap-2 text-center text-balance break-words"
      :class="nameClass"
    >
      <TeamImg :team-name="name" size="md" />
      {{ name }}
    </span>
    <span v-else class="block truncate text-center text-muted">{{
      t("page.match.detail.unknownTeam")
    }}</span>
  </div>
</template>
