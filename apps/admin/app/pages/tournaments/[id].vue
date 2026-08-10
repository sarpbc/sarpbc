<script lang="ts" setup>
import type { Match } from "~/types/matches";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const tournamentId = computed(() => route.params.id as string);
const isSyncing = ref(false);
const settingWinnerMatchId = ref<string | null>(null);
const awardsPanel = ref<{ refreshAwards: () => Promise<void> } | null>(null);

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
      await Promise.all([
        refreshTournament(),
        refreshMatches(),
        awardsPanel.value?.refreshAwards() ?? Promise.resolve(),
      ]);
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

        <TournamentAwardsPanel
          v-if="tournament"
          ref="awardsPanel"
          :tournament-id="tournamentId"
          :participants="tournament.participants ?? []"
        />

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
