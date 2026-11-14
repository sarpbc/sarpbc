<script lang="ts" setup>
import type { TournamentDetailMatch, TournamentMatchListItem } from "@sarpbc/types";
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
const lineupsMatch = ref<TournamentMatchListItem | null>(null);
const lineupsOpen = ref(false);
const streamScoreMatch = ref<TournamentMatchListItem | null>(null);
const streamScoreOpen = ref(false);
const streamsTarget = ref<{ path: string; title: string } | null>(null);
const streamsOpen = ref(false);
const viewershipTarget = ref<{ path: string; title: string } | null>(null);
const viewershipOpen = ref(false);
const bracketMatch = ref<{ match: TournamentDetailMatch; label: string } | null>(null);
const bracketOpen = ref(false);
const sourceMatch = ref<TournamentMatchListItem | null>(null);
const sourceOpen = ref(false);
const emptyBracketOpen = ref(false);
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

const displayMatches = computed(() => matches.value ?? []);
const detailMatches = computed(
  () => new Map((tournament.value?.matches ?? []).map((match) => [match.id, match])),
);

const editsBracket = computed(() => !!tournament.value && tournament.value.source !== "pandascore");
const canGenerateBracket = computed(
  () => editsBracket.value && tournament.value?.hasBracket === true && matches.value?.length === 0,
);

function openBracket(match: TournamentMatchListItem) {
  const detailed = detailMatches.value.get(match.id);
  if (!detailed) return;
  bracketMatch.value = { match: detailed, label: matchLabel(match) };
  bracketOpen.value = true;
}

function matchLabel(match: TournamentMatchListItem): string {
  const [teamA, teamB] = match.participants;
  const sides = `${teamA ? participantName(teamA) : "TBD"} vs ${teamB ? participantName(teamB) : "TBD"}`;
  const name = detailMatches.value.get(match.id)?.name;
  return name ? `${name} · ${sides}` : sides;
}

function matchSourceUrl(match: TournamentMatchListItem): string | null {
  return detailMatches.value.get(match.id)?.sourceUrl ?? null;
}

function openSource(match: TournamentMatchListItem) {
  sourceMatch.value = match;
  sourceOpen.value = true;
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

function openStreamScore(match: TournamentMatchListItem) {
  streamScoreMatch.value = match;
  streamScoreOpen.value = true;
}

function openLineups(match: TournamentMatchListItem) {
  lineupsMatch.value = match;
  lineupsOpen.value = true;
}

function openStreams(path: string, name: string) {
  streamsTarget.value = { path, title: t("page.tournaments.streams.title", { name }) };
  streamsOpen.value = true;
}

function openViewership(path: string, name: string) {
  viewershipTarget.value = { path, title: t("page.tournaments.viewership.title", { name }) };
  viewershipOpen.value = true;
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
          v-if="tournament"
          variant="soft"
          icon="i-fluent-live-24-regular"
          :label="$t('page.tournaments.streams.tournamentAction')"
          @click="openStreams(`/tournaments/${tournamentId}/streams`, tournament.name)"
        />
        <UButton
          v-if="tournament"
          variant="soft"
          icon="i-fluent-live-24-regular"
          :label="$t('page.tournaments.streams.eventAction')"
          @click="openStreams(`/events/${tournament.event.id}/streams`, tournament.event.name)"
        />
        <UButton
          v-if="tournament"
          variant="soft"
          icon="i-fluent-people-audience-24-regular"
          :label="$t('page.tournaments.viewership.eventAction')"
          @click="
            openViewership(`/events/${tournament.event.id}/viewership`, tournament.event.name)
          "
        />
        <UButton
          v-if="canGenerateBracket"
          variant="soft"
          icon="i-fluent-organization-horizontal-24-regular"
          :label="$t('page.tournaments.emptyBracket.action')"
          @click="emptyBracketOpen = true"
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

        <TournamentRosterSources
          v-if="tournament?.source === 'manual'"
          :tournament-id="tournamentId"
          :participants="tournament.participants ?? []"
          @saved="refreshTournament()"
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
              <ULink
                v-if="matchSourceUrl(match)"
                :to="matchSourceUrl(match) ?? undefined"
                external
                target="_blank"
                class="truncate text-sm text-primary hover:underline"
              >
                {{ matchSourceUrl(match) }}
              </ULink>
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
                size="xs"
                variant="soft"
                icon="i-fluent-link-24-regular"
                :label="$t('page.tournaments.matchSource.action')"
                @click="openSource(match)"
              />
              <UButton
                size="xs"
                variant="soft"
                icon="i-fluent-live-24-regular"
                :label="$t('page.tournaments.streams.matchAction')"
                @click="openStreams(`/tournaments/matches/${match.id}/streams`, matchLabel(match))"
              />
              <UButton
                size="xs"
                variant="soft"
                icon="i-fluent-people-team-24-regular"
                :label="$t('page.tournaments.lineups.action')"
                @click="openLineups(match)"
              />
              <UButton
                size="xs"
                variant="soft"
                icon="i-fluent-people-audience-24-regular"
                :label="$t('page.tournaments.viewership.matchAction')"
                @click="
                  openViewership(`/tournaments/matches/${match.id}/viewership`, matchLabel(match))
                "
              />
              <UButton
                v-if="tournament?.source === 'manual'"
                size="xs"
                variant="soft"
                icon="i-fluent-scan-text-24-regular"
                :label="$t('page.tournaments.streamScore.action')"
                @click="openStreamScore(match)"
              />
              <UButton
                v-if="editsBracket"
                size="xs"
                variant="soft"
                icon="i-fluent-organization-horizontal-24-regular"
                :label="$t('page.tournaments.bracket.action')"
                @click="openBracket(match)"
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

    <TournamentMatchSource
      v-if="sourceMatch"
      :key="sourceMatch.id"
      v-model:open="sourceOpen"
      :match-id="sourceMatch.id"
      :label="matchLabel(sourceMatch)"
      :source-url="matchSourceUrl(sourceMatch)"
      @saved="refreshTournament()"
    />

    <TournamentMatchLineups
      v-if="lineupsMatch && tournament"
      :key="lineupsMatch.id"
      v-model:open="lineupsOpen"
      :match="lineupsMatch"
      :label="matchLabel(lineupsMatch)"
      :participants="tournament.participants ?? []"
    />

    <TournamentMatchStreamScore
      v-if="streamScoreMatch"
      :key="streamScoreMatch.id"
      v-model:open="streamScoreOpen"
      :match="streamScoreMatch"
      :label="matchLabel(streamScoreMatch)"
      @confirmed="refreshMatches()"
    />

    <TournamentMatchBracket
      v-if="bracketMatch && tournament"
      :key="bracketMatch.match.id"
      v-model:open="bracketOpen"
      :match="bracketMatch.match"
      :label="bracketMatch.label"
      :participants="tournament.participants ?? []"
      :stage-matches="tournament.matches"
      @saved="reload()"
    />

    <TournamentEmptyBracket
      v-if="canGenerateBracket"
      v-model:open="emptyBracketOpen"
      :tournament-id="tournamentId"
      @created="reload()"
    />

    <StreamEditor
      v-if="streamsTarget"
      :key="streamsTarget.path"
      v-model:open="streamsOpen"
      :path="streamsTarget.path"
      :title="streamsTarget.title"
    />

    <ViewershipEditor
      v-if="viewershipTarget"
      :key="viewershipTarget.path"
      v-model:open="viewershipOpen"
      :path="viewershipTarget.path"
      :title="viewershipTarget.title"
    />
  </NuxtLayout>
</template>
