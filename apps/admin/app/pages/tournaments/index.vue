<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const limit = 50;
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
    label: t("page.tournaments.title"),
  },
]);

function tournamentLabel(tournament: Tournament): string {
  const year = tournament.beginAt
    ? new Date(tournament.beginAt).getFullYear()
    : new Date().getFullYear();
  const league = tournament.league?.name ? `${tournament.league.name} ` : "";
  return `${league}${year} ${tournament.name}`.trim();
}

async function handleSyncAdditions() {
  isSyncingAdditions.value = true;
  try {
    const success = await syncTournamentAdditions();
    if (success) {
      toast.add({ title: t("page.tournaments.syncAdditions"), color: "success" });
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
      toast.add({ title: t("page.tournaments.syncTournament"), color: "success" });
      await refresh();
    }
  } finally {
    syncingTournamentId.value = null;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        :loading="isSyncingAdditions"
        icon="i-fluent-arrow-sync-24-regular"
        :label="$t('page.tournaments.syncAdditions')"
        @click="handleSyncAdditions"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p v-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.tournaments.loading") }}
        </p>
        <p v-else class="text-sm text-muted">
          {{ $t("page.tournaments.tournamentsCount", { count: tournaments.length }) }}
        </p>

        <div
          v-for="tournament in tournaments"
          :key="tournament.id"
          class="flex w-full flex-row items-center justify-between gap-4 border border-default p-4"
        >
          <div class="flex min-w-0 flex-col gap-1">
            <h2 class="truncate text-lg font-semibold">
              {{ tournamentLabel(tournament) }}
            </h2>
            <p v-if="tournament.beginAt" class="text-sm text-muted">
              {{ new Date(tournament.beginAt).toLocaleDateString() }}
            </p>
          </div>

          <div class="flex shrink-0 flex-row gap-2">
            <UButton
              variant="soft"
              icon="i-fluent-trophy-24-regular"
              :label="$t('page.tournaments.viewMatches')"
              :to="localePath(`/tournaments/${tournament.id}`)"
            />
            <UButton
              variant="soft"
              icon="i-fluent-arrow-sync-24-regular"
              :loading="syncingTournamentId === tournament.id"
              :title="$t('page.tournaments.syncTournament')"
              @click="handleSyncTournament(tournament.id)"
            />
          </div>
        </div>

        <div v-if="status !== 'pending' && tournaments.length === 0" class="text-sm text-muted">
          {{ $t("page.tournaments.noTournaments") }}
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
