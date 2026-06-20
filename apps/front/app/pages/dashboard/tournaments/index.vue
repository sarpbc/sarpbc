<script lang="ts" setup>
import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const limit = 50;
const page = ref(1);
const isSyncingAdditions = ref(false);
const syncingTournamentId = ref<string | null>(null);

const { data, status, refresh } = await useLazyAsyncData(
  "admin-tournaments-list",
  () => getAllTournaments({ limit }),
  { server: false },
);

const tournaments = computed(() => data.value ?? []);

const breadcrumbItems = computed(() => [
  {
    label: t("page.dashboard.tournaments.title"),
  },
]);

function tournamentLabel(tournament: Tournament): string {
  const year = tournament.beginAt
    ? new Date(tournament.beginAt).getFullYear()
    : new Date().getFullYear();
  const league = tournament.league?.name ? `${tournament.league.name} ` : "";
  return `${league}${year} ${tournament.name}`.trim();
}

function matchScore(match: Match): string {
  if (!match.participants?.length || !match.results?.length) {
    return "-";
  }

  return match.participants
    .map((participant) => {
      const result = match.results?.find((r) => r.participant === participant.id);
      return `${participant.team.name}: ${result?.score ?? "-"}`;
    })
    .join(" · ");
}

async function handleSyncAdditions() {
  isSyncingAdditions.value = true;
  try {
    const success = await syncTournamentAdditions();
    if (success) {
      toast.add({ title: t("page.dashboard.tournaments.syncAdditions"), color: "success" });
      await refresh();
    }
  } finally {
    isSyncingAdditions.value = false;
  }
}

async function handleSyncTournament(tournamentId: string) {
  syncingTournamentId.value = tournamentId;
  try {
    const success = await syncTournament(tournamentId);
    if (success) {
      toast.add({ title: t("page.dashboard.tournaments.syncTournament"), color: "success" });
      await refresh();
    }
  } finally {
    syncingTournamentId.value = null;
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
        :loading="isSyncingAdditions"
        icon="i-fluent-arrow-sync-24-regular"
        :label="$t('page.dashboard.tournaments.syncAdditions')"
        @click="handleSyncAdditions"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p v-if="status === 'pending'" class="text-sm text-muted">Loading...</p>
        <p v-else class="text-sm text-muted">
          {{ $t("page.dashboard.tournaments.tournamentsCount", { count: tournaments.length }) }}
        </p>

        <UiCard
          v-for="tournament in tournaments"
          :key="tournament.id"
          class="w-full flex flex-row items-center justify-between p-4 gap-4"
        >
          <div class="flex flex-col gap-1 min-w-0">
            <h2 class="text-lg font-semibold truncate">
              {{ tournamentLabel(tournament) }}
            </h2>
            <p v-if="tournament.beginAt" class="text-sm text-muted">
              {{ new Date(tournament.beginAt).toLocaleDateString() }}
            </p>
          </div>

          <div class="flex flex-row gap-2 shrink-0">
            <UButton
              variant="soft"
              icon="i-fluent-trophy-24-regular"
              :label="$t('page.dashboard.tournaments.viewMatches')"
              :to="localePath(`/dashboard/tournaments/${tournament.id}`)"
            />
            <UButton
              variant="soft"
              icon="i-fluent-arrow-sync-24-regular"
              :loading="syncingTournamentId === tournament.id"
              :title="$t('page.dashboard.tournaments.syncTournament')"
              @click="handleSyncTournament(tournament.id)"
            />
          </div>
        </UiCard>

        <div v-if="status !== 'pending' && tournaments.length === 0" class="text-sm text-muted">
          {{ $t("page.dashboard.tournaments.noMatches") }}
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
