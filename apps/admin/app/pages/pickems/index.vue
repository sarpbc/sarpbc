<script lang="ts" setup>
import {
  getApiErrorMessage,
  resolveThemedLogoUrl,
  tournamentStageLabel,
  participantName,
} from "@sarpbc/utils";
import type { ThemedLogo } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();
const colorMode = useColorMode();

const enablingTournamentId = ref<string | null>(null);
const { syncingId, iconFor, colorFor, run: runTournamentSync } = useTournamentSyncFeedback();

const {
  items: tournaments,
  total,
  page,
  limit,
  status,
  error,
  refresh,
} = useAdminList("admin-pickems-tournaments", async (range) => {
  const response = await getAllTournaments(range);

  return { items: response.tournaments, total: response.total };
});

const breadcrumbItems = computed(() => [
  {
    label: t("page.pickems.title"),
  },
]);

const teamLogoSrc = (team: ThemedLogo | null | undefined) =>
  resolveThemedLogoUrl(team, colorMode.value);

const handleSyncTournament = async (tournamentId: string) => {
  try {
    await runTournamentSync(tournamentId, refresh);
  } catch (syncError) {
    reportError(syncError);
  }
};

const handleEnablePickems = async (tournamentId: string) => {
  enablingTournamentId.value = tournamentId;

  try {
    await enableTournamentPickems(tournamentId);
    toast.add({ title: t("page.pickems.enablePickems"), color: "success" });
    await refresh();
  } catch (enableError) {
    reportError(enableError);
  } finally {
    enablingTournamentId.value = null;
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <LoadError
          v-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('common.loadFailed')"
          @retry="refresh()"
        />
        <p v-else-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.pickems.loading") }}
        </p>
        <p v-else class="text-sm text-muted">
          {{ $t("page.pickems.tournamentsCount", { count: total }) }}
        </p>

        <div v-if="tournaments.length > 0" class="divide-y divide-default border-y border-default">
          <div
            v-for="tournament in tournaments"
            :key="tournament.id"
            class="flex min-h-row w-full flex-row items-center justify-between gap-4 py-2"
          >
            <div class="flex min-w-0 flex-col gap-0.5">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ tournamentStageLabel(tournament) }}
              </p>
              <div v-if="tournament.participants?.length" class="flex flex-row gap-1">
                <div
                  v-for="participant in tournament.participants"
                  :key="participant.id"
                  class="size-fit"
                >
                  <img
                    v-if="teamLogoSrc(participant.team)"
                    :src="teamLogoSrc(participant.team)"
                    :alt="participantName(participant)"
                    class="size-4"
                  />
                </div>
              </div>
            </div>

            <div class="flex shrink-0 flex-row gap-1">
              <UButton
                variant="ghost"
                size="xs"
                icon="i-fluent-arrow-expand-24-regular"
                :title="$t('page.pickems.expand')"
                :aria-label="$t('page.pickems.expand')"
                :to="localePath(`/pickems/${tournament.id}`)"
              />
              <UButton
                variant="ghost"
                size="xs"
                :icon="iconFor(tournament.id)"
                :color="colorFor(tournament.id)"
                :title="$t('page.pickems.syncTournament')"
                :aria-label="$t('page.pickems.syncTournament')"
                :loading="syncingId === tournament.id"
                @click="handleSyncTournament(tournament.id)"
              />
              <UButton
                variant="ghost"
                size="xs"
                icon="i-fluent-predictions-24-regular"
                :title="$t('page.pickems.enablePickems')"
                :aria-label="$t('page.pickems.enablePickems')"
                :loading="enablingTournamentId === tournament.id"
                @click="handleEnablePickems(tournament.id)"
              />
            </div>
          </div>
        </div>

        <div v-else-if="status === 'success'" class="py-8 text-center text-sm text-muted">
          {{ $t("page.pickems.noTournaments") }}
        </div>

        <UPagination
          v-if="total > limit"
          :page="page"
          :total="total"
          :items-per-page="limit"
          @update:page="page = $event"
        />
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
