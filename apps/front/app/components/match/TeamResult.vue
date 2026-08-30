<script setup lang="ts">
import type { MatchStatus } from "~/types/matches";
import { shouldShowMatchScores } from "~/types/matches";
import type { TournamentParticipant } from "~/types/tournament";

const { t } = useI18n();

const { participant, score, winner, matchStatus } = defineProps<{
  participant: TournamentParticipant | undefined;
  score: number | null;
  winner: boolean | undefined;
  matchStatus: MatchStatus;
}>();

function getScoreColorClass(): string {
  if (winner === undefined) return "text-muted";
  return winner ? "text-success" : "text-error";
}
</script>

<template>
  <div v-if="participant?.team.slug" class="flex flex-col items-center justify-center">
    <SLink
      :to="$localePath(`/team/${participant.team.slug}`)"
      variant="muted"
      class="flex flex-col items-center justify-center w-fit"
    >
      <TeamImg
        :team-name="participant.team.name"
        :image-url="participant.team.imageUrl"
        :dark-mode-image-url="participant.team.darkModeImageUrl"
        size="md"
      />
      {{ participant.team.name }}
      <span
        v-if="shouldShowMatchScores(matchStatus) && score !== null"
        :class="getScoreColorClass()"
        >{{ score }}</span
      >
    </SLink>
  </div>
  <span v-else class="block truncate">{{ t("page.match.detail.unknownTeam") }}</span>
</template>
