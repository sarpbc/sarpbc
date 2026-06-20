<script lang="ts" setup>
import type { Match } from "~/types/matches";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const tournamentId = computed(() => route.params.id as string);
const isSyncing = ref(false);
const settingWinnerMatchId = ref<string | null>(null);

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
    label: t("page.dashboard.tournaments.title"),
    to: localePath("/dashboard/tournaments"),
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
      toast.add({ title: t("page.dashboard.tournaments.syncTournament"), color: "success" });
      await Promise.all([refreshTournament(), refreshMatches()]);
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
      toast.add({ title: t("page.dashboard.tournaments.match.setWinner"), color: "success" });
      await refreshMatches();
    }
  } finally {
    settingWinnerMatchId.value = null;
  }
}
</script>

<template>
  <NuxtLayout name="dashboardheader">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        :loading="isSyncing"
        icon="i-fluent-arrow-sync-24-regular"
        :label="$t('page.dashboard.tournaments.match.syncScores')"
        @click="handleRefresh"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <div v-if="tournament" class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold">{{ tournament.name }}</h1>
          <p v-if="tournament.beginAt" class="text-sm text-muted">
            {{ new Date(tournament.beginAt).toLocaleDateString() }}
          </p>
        </div>

        <p class="text-sm text-muted">
          {{
            $t("page.dashboard.tournaments.matchesCount", {
              count: displayMatches.length,
            })
          }}
        </p>

        <UiCard
          v-for="match in displayMatches"
          :key="match.id"
          class="w-full flex flex-col gap-3 p-4"
        >
          <div class="flex flex-row items-start justify-between gap-4">
            <div class="flex flex-col gap-1 min-w-0">
              <h2 class="text-lg font-semibold">{{ matchLabel(match) }}</h2>
              <p class="text-sm text-muted">
                {{ $t("page.dashboard.tournaments.match.status") }}:
                {{ match.status ?? "unknown" }}
              </p>
              <p class="text-sm">
                {{ $t("page.dashboard.tournaments.match.score") }}: {{ matchScore(match) }}
              </p>
            </div>

            <div class="flex flex-col gap-2 shrink-0">
              <UButton
                v-for="participant in match.participants"
                :key="participant.id"
                size="sm"
                variant="soft"
                :loading="settingWinnerMatchId === match.id"
                :label="`${$t('page.dashboard.tournaments.match.setWinner')}: ${participant.team.name}`"
                @click="handleSetWinner(match, participant.id)"
              />
            </div>
          </div>
        </UiCard>

        <div v-if="displayMatches.length === 0" class="text-sm text-muted">
          {{ $t("page.dashboard.tournaments.noMatches") }}
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
