<script lang="ts" setup>
import type { HeadToHead } from "~/types/matches";

const { t, locale } = useI18n();

const { headToHead, teamAName, teamBName } = defineProps<{
  headToHead: HeadToHead;
  teamAName: string;
  teamBName: string;
}>();

const hasMeetings = computed(() => headToHead.totalMeetings > 0);

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      dateStyle: "medium",
    }),
);

function meetingDate(meeting: HeadToHead["recentMeetings"][number]) {
  const date = meeting.endAt ?? meeting.beginAt;
  return date ? dateFormatter.value.format(new Date(date)) : "";
}

function winnerLabel(winnerTeamId: string | null) {
  if (winnerTeamId === headToHead.teamAId) {
    return teamAName;
  }
  if (winnerTeamId === headToHead.teamBId) {
    return teamBName;
  }
  return t("page.match.detail.h2h.draw");
}
</script>

<template>
  <UiCard class="p-4 md:p-6">
    <div
      class="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-default pb-3"
    >
      <h3 class="text-sm font-semibold">{{ t("page.match.detail.sections.headToHead") }}</h3>
      <span v-if="hasMeetings" class="text-sm font-medium text-muted tabular-nums">
        {{
          t("page.match.detail.h2h.record", {
            teamA: teamAName,
            teamAWins: headToHead.teamAWins,
            teamB: teamBName,
            teamBWins: headToHead.teamBWins,
          })
        }}
      </span>
    </div>

    <p v-if="!hasMeetings" class="text-sm text-pretty text-muted">
      {{ t("page.match.detail.h2h.empty") }}
    </p>

    <ul v-else class="flex flex-col gap-1.5">
      <li
        v-for="meeting in headToHead.recentMeetings"
        :key="meeting.id"
        class="flex items-center justify-between gap-3 rounded-md bg-elevated/50 px-2.5 py-2 text-sm"
      >
        <div class="flex min-w-0 flex-col gap-0.5">
          <UiLink :to="$localePath(`/matches/${meeting.id}`)" variant="inline" class="truncate">
            {{ meeting.tournamentLabel }}
          </UiLink>
          <span class="truncate text-xs text-muted tabular-nums">
            {{ meetingDate(meeting) }}
          </span>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-0.5 text-right">
          <span class="font-mono tabular-nums text-toned">
            {{
              t("page.match.detail.h2h.score", {
                scoreA: meeting.scoreA ?? "-",
                scoreB: meeting.scoreB ?? "-",
              })
            }}
          </span>
          <span v-if="meeting.winnerTeamId" class="text-xs text-muted">
            {{ t("page.match.detail.h2h.winner", { team: winnerLabel(meeting.winnerTeamId) }) }}
          </span>
        </div>
      </li>
    </ul>
  </UiCard>
</template>
