<script lang="ts" setup>
import type { TournamentMatchListItem } from "@sarpbc/types";
import { getApiErrorMessage, participantName } from "@sarpbc/utils";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const tournamentId = computed(() => route.params.id as string);
const settingWinnerMatchId = ref<string | null>(null);
const vodsMatch = ref<TournamentMatchListItem | null>(null);
const vodsOpen = ref(false);
const matchToDelete = ref<TournamentMatchListItem | null>(null);
const awardsPanel = ref<{ refreshAwards: () => Promise<void> } | null>(null);
const { syncingId, iconFor, colorFor, run: runTournamentSync } = useTournamentSyncFeedback();

const {
  data: tournament,
  error: tournamentError,
  refresh: refreshTournament,
} = await useLazyAsyncData(
  () => `admin-tournament-${tournamentId.value}`,
  () => getTournamentById(tournamentId.value),
  { server: false, watch: [tournamentId] },
);

const {
  data: matches,
  error: matchesError,
  refresh: refreshMatches,
} = await useLazyAsyncData(
  () => `admin-tournament-${tournamentId.value}-matches`,
  () => getTournamentMatches(tournamentId.value),
  { server: false, watch: [tournamentId] },
);

const loadError = computed(() => tournamentError.value ?? matchesError.value);

async function reload() {
  await Promise.all([refreshTournament(), refreshMatches()]);
}

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

function matchLabel(match: TournamentMatchListItem): string {
  const [teamA, teamB] = match.participants;
  return `${teamA ? participantName(teamA) : "TBD"} vs ${teamB ? participantName(teamB) : "TBD"}`;
}

function matchScore(match: TournamentMatchListItem): string {
  if (!match.participants?.length) {
    return "-";
  }

  return match.participants
    .map((participant) => {
      const result = match.results?.find((r) => r.participant === participant.id);
      return `${participantName(participant)}: ${result?.score ?? "-"}`;
    })
    .join(" · ");
}

async function handleRefresh() {
  try {
    await runTournamentSync(tournamentId.value, async () => {
      await Promise.all([
        refreshTournament(),
        refreshMatches(),
        awardsPanel.value?.refreshAwards() ?? Promise.resolve(),
      ]);
    });
  } catch (syncError) {
    reportError(syncError);
  }
}

function openVods(match: TournamentMatchListItem) {
  vodsMatch.value = match;
  vodsOpen.value = true;
}

async function handleSetWinner(match: TournamentMatchListItem, participantId: string) {
  settingWinnerMatchId.value = match.id;
  try {
    await setMatchWinner(match.id, participantId);
    toast.add({ title: t("page.tournaments.match.setWinner"), color: "success" });
    await refreshMatches();
  } catch (winnerError) {
    reportError(winnerError);
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
          v-if="tournament"
          variant="soft"
          icon="i-fluent-edit-24-regular"
          :label="$t('page.tournaments.edit.action')"
          :to="localePath(`/tournaments/${tournamentId}/edit`)"
        />
        <UButton
          v-if="tournament?.source === 'pandascore'"
          :loading="syncingId === tournamentId"
          :icon="iconFor(tournamentId)"
          :color="colorFor(tournamentId)"
          :label="$t('page.tournaments.match.syncScores')"
          @click="handleRefresh"
        />
      </div>
    </template>

    <DashboardContent>
      <LoadError
        v-if="loadError"
        :message="getApiErrorMessage(loadError) ?? $t('common.loadFailed')"
        @retry="reload()"
      />
      <div v-else class="flex flex-col gap-4">
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

        <TournamentPrizesPanel
          v-if="tournament"
          :tournament-id="tournamentId"
          :prizepool="tournament.prizepool"
          :participants="tournament.participants ?? []"
        />

        <TournamentStatsImportPanel
          v-if="tournament"
          :tournament-id="tournamentId"
          :matches="matches ?? []"
        />

        <p class="text-sm text-muted">
          {{
            $t("page.tournaments.matchesCount", {
              count: displayMatches.length,
            })
          }}
        </p>

        <div
          v-if="displayMatches.length > 0"
          class="divide-y divide-default border-y border-default"
        >
          <div
            v-for="match in displayMatches"
            :key="match.id"
            class="flex w-full flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex min-w-0 flex-col gap-0.5">
              <p class="truncate text-sm font-medium text-highlighted">{{ matchLabel(match) }}</p>
              <p class="text-sm text-muted">
                {{ $t("page.tournaments.match.status") }}:
                {{ match.status ?? "unknown" }}
                · {{ $t("page.tournaments.match.score") }}: {{ matchScore(match) }}
              </p>
            </div>

            <div class="flex shrink-0 flex-row flex-wrap gap-1">
              <UButton
                size="xs"
                variant="soft"
                icon="i-fluent-video-clip-24-regular"
                :label="$t('page.tournaments.vods.action')"
                @click="openVods(match)"
              />
              <UButton
                v-for="participant in match.participants"
                :key="participant.id"
                size="xs"
                variant="ghost"
                :loading="settingWinnerMatchId === match.id"
                :label="`${$t('page.tournaments.match.setWinner')}: ${participantName(participant)}`"
                @click="handleSetWinner(match, participant.id)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-fluent-delete-24-regular"
                :label="$t('page.tournaments.match.delete.action')"
                @click="matchToDelete = match"
              />
            </div>
          </div>
        </div>

        <div v-else-if="matches" class="py-8 text-center text-sm text-muted">
          {{ $t("page.tournaments.noMatches") }}
        </div>
      </div>
    </DashboardContent>

    <ConfirmDeleteModal
      v-model:target="matchToDelete"
      :title="$t('page.tournaments.match.delete.title')"
      :confirm-label="$t('page.tournaments.match.delete.action')"
      :message="
        (target) =>
          $t('page.tournaments.match.delete.confirm', {
            match: matchLabel(target),
            score: matchScore(target),
          })
      "
      :remove="(target) => deleteMatch(target.id)"
      @deleted="reload()"
    />

    <TournamentMatchVods
      v-if="vodsMatch"
      v-model:open="vodsOpen"
      :match="vodsMatch"
      :label="matchLabel(vodsMatch)"
    />
  </NuxtLayout>
</template>
