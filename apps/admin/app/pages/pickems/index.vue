<script lang="ts" setup>
import { resolveThemedLogoUrl } from "@sarpbc/utils";
import type { Tournament } from "~/types/tournament";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const colorMode = useColorMode();

const enablingTournamentId = ref<string | null>(null);
const { syncingId, iconFor, colorFor, run: runTournamentSync } = useTournamentSyncFeedback();

const { data, status, refresh } = await useLazyAsyncData(
  "admin-pickems-tournaments",
  () => getAllTournaments({ limit: 20 }),
  { server: false },
);

const tournaments = computed(() => data.value?.tournaments ?? []);

const breadcrumbItems = computed(() => [
  {
    label: t("page.pickems.title"),
  },
]);

function tournamentLabel(tournament: Tournament): string {
  const year = tournament.beginAt
    ? new Date(tournament.beginAt).getFullYear()
    : new Date().getFullYear();
  const league = tournament.league?.name ? `${tournament.league.name} ` : "";
  return `${league}${year} ${tournament.name}`.trim();
}

function teamLogoSrc(
  team: { imageUrl?: string | null; darkModeImageUrl?: string | null } | null | undefined,
) {
  if (!team) {
    return undefined;
  }
  return resolveThemedLogoUrl(team.imageUrl, team.darkModeImageUrl, colorMode.value);
}

async function handleSyncTournament(tournamentId: string) {
  await runTournamentSync(tournamentId, refresh);
}

async function handleEnablePickems(tournamentId: string) {
  enablingTournamentId.value = tournamentId;
  try {
    const success = await setTournamentPickemsEnabled(tournamentId, true);
    if (success) {
      toast.add({ title: t("page.pickems.enablePickems"), color: "success" });
      await refresh();
    }
  } finally {
    enablingTournamentId.value = null;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p v-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.pickems.loading") }}
        </p>
        <p v-else class="text-sm text-muted">
          {{ $t("page.pickems.tournamentsCount", { count: tournaments.length }) }}
        </p>

        <div v-if="tournaments.length > 0" class="divide-y divide-default border-y border-default">
          <div
            v-for="tournament in tournaments"
            :key="tournament.id"
            class="flex min-h-row w-full flex-row items-center justify-between gap-4 py-2"
          >
            <div class="flex min-w-0 flex-col gap-0.5">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ tournamentLabel(tournament) }}
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
                    :alt="participant.team.name"
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

        <div v-else-if="status !== 'pending'" class="py-8 text-center text-sm text-muted">
          {{ $t("page.pickems.noTournaments") }}
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
