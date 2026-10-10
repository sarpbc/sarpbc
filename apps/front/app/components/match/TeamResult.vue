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
  if (matchStatus === "live") return "text-highlighted";
  if (winner === undefined) return "text-muted";
  return winner ? "text-success font-bold" : "text-muted";
}
</script>

<template>
  <div v-if="participant?.team.slug" class="flex flex-col items-center justify-center">
    <SLink
      :to="$localePath(`/team/${participant.team.slug}`)"
      variant="inline"
      class="flex max-w-full flex-col items-center justify-center text-center text-balance break-words"
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
  <span v-else class="block truncate text-center">{{ t("page.match.detail.unknownTeam") }}</span>
</template>
