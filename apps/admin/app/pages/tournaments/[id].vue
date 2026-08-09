<script lang="ts" setup>
import type { Match } from "~/types/matches";
import { PlayerAwardType, type PlayerAwardListItem } from "@sarpbc/types";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const tournamentId = computed(() => route.params.id as string);
const isSyncing = ref(false);
const settingWinnerMatchId = ref<string | null>(null);
const assigningMvpPlayerId = ref<string | null>(null);
const removingAwardId = ref<string | null>(null);

const { data: tournament, refresh: refreshTournament } = await useLazyAsyncData(
  () => `admin-tournament-${tournamentId.value}`,
  () => getTournamentById(tournamentId.value),
  { server: false, watch: [tournamentId] },
);

const { data: matches, refresh: refreshMatches } = await useLazyAsyncData(
  () => `admin-tournament-${tournamentId.value}-matches`,
  () => getTournamentMatches(tournamentId.value),
  { server: false, watch: [tournamentId] },
);

const { data: awards, refresh: refreshAwards } = await useLazyAsyncData(
  () => `admin-tournament-${tournamentId.value}-awards`,
  () => getTournamentAwards(tournamentId.value),
  { server: false, watch: [tournamentId] },
);

const breadcrumbItems = computed(() => [
  {
    label: t("page.tournaments.title"),
    to: localePath("/tournaments"),
  },
  {
    label: tournament.value?.name ?? tournamentId.value,
  },
]);

const displayMatches = computed(() =>
  (matches.value ?? []).filter((match) => (match.participants?.length ?? 0) >= 2),
);

const mvpAward = computed(() =>
  (awards.value ?? []).find((award) => award.awardType === PlayerAwardType.MVP),
);

const rosterEntries = computed(() => {
  const participants = tournament.value?.participants ?? [];
  const entries: Array<{
    participantId: string;
    teamName: string;
    playerId: string;
    playerName: string;
  }> = [];

  for (const participant of participants) {
    for (const player of participant.players ?? []) {
      entries.push({
        participantId: participant.id,
        teamName: participant.team.name,
        playerId: player.id,
        playerName: player.name,
      });
    }
  }

  return entries.sort((a, b) => a.playerName.localeCompare(b.playerName));
});

function matchLabel(match: Match): string {
  const teamA = match.participants?.[0]?.team.name ?? "TBD";
  const teamB = match.participants?.[1]?.team.name ?? "TBD";
  return `${teamA} vs ${teamB}`;
}

function matchScore(match: Match): string {
  if (!match.participants?.length) {
    return "-";
  }

  return match.participants
    .map((participant) => {
      const result = match.results?.find((r) => r.participant === participant.id);
      return `${participant.team.name}: ${result?.score ?? "-"}`;
    })
    .join(" · ");
}

async function handleRefresh() {
  isSyncing.value = true;
  try {
    const success = await syncTournament(tournamentId.value);
    if (success) {
      toast.add({ title: t("page.tournaments.syncTournament"), color: "success" });
      await Promise.all([refreshTournament(), refreshMatches(), refreshAwards()]);
    }
  } finally {
    isSyncing.value = false;
  }
}

async function handleSetWinner(match: Match, participantId: string) {
  settingWinnerMatchId.value = match.id;
  try {
    const success = await setMatchWinner(match.id, participantId);
    if (success) {
      toast.add({ title: t("page.tournaments.match.setWinner"), color: "success" });
      await refreshMatches();
    }
  } finally {
    settingWinnerMatchId.value = null;
  }
}

async function handleAssignMvp(entry: {
  participantId: string;
  playerId: string;
  playerName: string;
}) {
  assigningMvpPlayerId.value = entry.playerId;
  try {
    const award = await createTournamentAward(tournamentId.value, {
      participantId: entry.participantId,
      playerId: entry.playerId,
      awardType: PlayerAwardType.MVP,
    });
    if (award) {
      toast.add({
        title: t("page.tournaments.awards.mvpAssigned", { name: entry.playerName }),
        color: "success",
      });
      await refreshAwards();
    }
  } finally {
    assigningMvpPlayerId.value = null;
  }
}

async function handleRemoveAward(award: PlayerAwardListItem) {
  removingAwardId.value = award.id;
  try {
    const success = await deleteTournamentAward(tournamentId.value, award.id);
    if (success) {
      toast.add({
        title: t("page.tournaments.awards.removed", {
          type: t(`page.tournaments.awards.types.${award.awardType}`),
        }),
        color: "success",
      });
      await refreshAwards();
    }
  } finally {
    removingAwardId.value = null;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <div class="flex flex-row gap-2">
        <UButton
          v-if="tournament?.source === 'manual'"
          variant="soft"
          icon="i-fluent-edit-24-regular"
          :label="$t('page.tournaments.edit.action')"
          :to="localePath(`/tournaments/${tournamentId}/edit`)"
        />
        <UButton
          v-if="tournament?.source !== 'manual'"
          :loading="isSyncing"
          icon="i-fluent-arrow-sync-24-regular"
          :label="$t('page.tournaments.match.syncScores')"
          @click="handleRefresh"
        />
      </div>
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <div v-if="tournament" class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold">{{ tournament.name }}</h1>
          <p v-if="tournament.beginAt" class="text-sm text-muted">
            {{ new Date(tournament.beginAt).toLocaleDateString() }}
          </p>
        </div>

        <section class="flex flex-col gap-3 border border-default p-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-lg font-semibold">{{ $t("page.tournaments.awards.title") }}</h2>
            <p class="text-sm text-muted">{{ $t("page.tournaments.awards.mvpHint") }}</p>
          </div>

          <div
            v-if="mvpAward"
            class="flex flex-row items-center justify-between gap-4 border border-default p-3"
          >
            <div class="min-w-0">
              <p class="font-medium">
                {{ $t("page.tournaments.awards.types.mvp") }}:
                {{ mvpAward.player?.name }}
              </p>
              <p v-if="mvpAward.participant?.team?.name" class="text-sm text-muted">
                {{ mvpAward.participant.team.name }}
              </p>
            </div>
            <UButton
              size="sm"
              color="error"
              variant="soft"
              :loading="removingAwardId === mvpAward.id"
              :label="$t('page.tournaments.awards.remove')"
              @click="handleRemoveAward(mvpAward)"
            />
          </div>

          <div v-else-if="rosterEntries.length > 0" class="flex flex-col gap-2">
            <p class="text-sm text-muted">{{ $t("page.tournaments.awards.assignMvp") }}</p>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="entry in rosterEntries"
                :key="entry.playerId"
                size="sm"
                variant="soft"
                :loading="assigningMvpPlayerId === entry.playerId"
                :label="`${entry.playerName} (${entry.teamName})`"
                @click="handleAssignMvp(entry)"
              />
            </div>
          </div>

          <p v-else class="text-sm text-muted">
            {{ $t("page.tournaments.awards.noRoster") }}
          </p>
        </section>

        <p class="text-sm text-muted">
          {{
            $t("page.tournaments.matchesCount", {
              count: displayMatches.length,
            })
          }}
        </p>

        <div
          v-for="match in displayMatches"
          :key="match.id"
          class="flex w-full flex-col gap-3 border border-default p-4"
        >
          <div class="flex flex-row items-start justify-between gap-4">
            <div class="flex min-w-0 flex-col gap-1">
              <h2 class="text-lg font-semibold">{{ matchLabel(match) }}</h2>
              <p class="text-sm text-muted">
                {{ $t("page.tournaments.match.status") }}:
                {{ match.status ?? "unknown" }}
              </p>
              <p class="text-sm">
                {{ $t("page.tournaments.match.score") }}: {{ matchScore(match) }}
              </p>
            </div>

            <div class="flex shrink-0 flex-col gap-2">
              <UButton
                v-for="participant in match.participants"
                :key="participant.id"
                size="sm"
                variant="soft"
                :loading="settingWinnerMatchId === match.id"
                :label="`${$t('page.tournaments.match.setWinner')}: ${participant.team.name}`"
                @click="handleSetWinner(match, participant.id)"
              />
            </div>
          </div>
        </div>

        <div v-if="displayMatches.length === 0" class="text-sm text-muted">
          {{ $t("page.tournaments.noMatches") }}
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
