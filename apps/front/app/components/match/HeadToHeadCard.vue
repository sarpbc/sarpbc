<script lang="ts" setup>
import type { HeadToHead } from "~/types/matches";

const { t, locale } = useI18n();
const localePath = useLocalePath();

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
  <SCard flush-bottom class="flex flex-col">
    <SListItem v-if="hasMeetings" size="default" divider class="min-w-0">
      <span class="w-full text-xs font-medium text-muted tabular-nums">
        {{
          t("page.match.detail.h2h.record", {
            teamA: teamAName,
            teamAWins: headToHead.teamAWins,
            teamB: teamBName,
            teamBWins: headToHead.teamBWins,
          })
        }}
      </span>
    </SListItem>

    <SListItem v-if="!hasMeetings" size="default" divider>
      <p class="text-xs text-pretty text-muted">
        {{ t("page.match.detail.h2h.empty") }}
      </p>
    </SListItem>

    <SListItem
      v-for="meeting in headToHead.recentMeetings"
      :key="meeting.id"
      size="default"
      divider
      :to="localePath(`/matches/${meeting.id}`)"
      class="min-w-0"
    >
      <div class="flex w-full min-w-0 items-center justify-between gap-3 text-xs font-medium">
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="truncate text-toned">{{ meeting.tournamentLabel }}</span>
          <span v-if="meetingDate(meeting)" class="truncate text-muted tabular-nums">
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
          <span v-if="meeting.winnerTeamId" class="text-muted">
            {{ t("page.match.detail.h2h.winner", { team: winnerLabel(meeting.winnerTeamId) }) }}
          </span>
        </div>
      </div>
    </SListItem>
  </SCard>
</template>
