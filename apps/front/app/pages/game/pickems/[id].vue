<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import {
  displayMatchScore,
  getMatchParticipantScore,
  shouldShowMatchScores,
  type Match,
} from "~/types/matches";
import { resolveMatchDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";
import {
  getPickOutcome,
  getTournamentDisplayName,
  isMatchLockedForPickem,
  type PickemPickState,
} from "~/utils/pickems";

const LEADERBOARD_TOP = 10;

type PickemDetailTab = "pickem" | "leaderboard";

const route = useRoute();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const posthog = usePostHog();
const toast = useToast();
const localePath = useLocalePath();
const user = useUser();

const tournamentId = computed(() => route.params.id as string);
const isSignedIn = computed(() => Boolean(user.value));
const sessionReady = computed(() => user.value !== undefined);

const {
  data: tournament,
  pending: tournamentPending,
  error: tournamentError,
  refresh: refreshTournament,
} = await useLazyAsyncData(
  () => `pickem-tournament-${tournamentId.value}`,
  () => getTournamentById(tournamentId.value),
);

const {
  data: picks,
  pending: picksPending,
  refresh: refreshPicks,
} = useLazyAsyncData(
  () => `pickem-picks-${tournamentId.value}-${user.value?.id ?? "guest"}`,
  async () => {
    if (!user.value) {
      return new Map<string, PickemPickState>();
    }
    try {
      const newPicks = await getUserPickemsForTournament(tournamentId.value);
      return new Map<string, PickemPickState>(
        newPicks.map((pick) => [
          pick.match,
          {
            pickedParticipant: pick.pickedParticipant,
            points: pick.points,
            scored: pick.scored,
          },
        ]),
      );
    } catch {
      return new Map<string, PickemPickState>();
    }
  },
  { server: false, watch: [() => user.value?.id] },
);

const {
  data: leaderboard,
  pending: leaderboardPending,
  refresh: refreshLeaderboard,
} = useLazyAsyncData(
  () => `pickem-leaderboard-${tournamentId.value}`,
  () => getPickemLeaderboard(tournamentId.value),
  { default: () => [] },
);

const { data: personalRank, refresh: refreshPersonalRank } = useLazyAsyncData(
  () => `pickem-me-${tournamentId.value}-${user.value?.id ?? "guest"}`,
  async () => {
    if (!user.value) return null;
    try {
      return await getPickemPersonalRanking(tournamentId.value);
    } catch {
      return null;
    }
  },
  { server: false, watch: [() => user.value?.id] },
);

const displayName = computed(() =>
  tournament.value ? getTournamentDisplayName(tournament.value) : "",
);

watch(
  [displayName, tournament],
  () => {
    setPageSeo({
      title: tournament.value
        ? t("page.game.pickems.detail.seoTitle", { tournament: displayName.value })
        : t("page.game.pickems.title"),
      description: t("page.game.pickems.description"),
    });
  },
  { immediate: true },
);

const pickemTimeDf = computed(
  () =>
    new DateFormatter(locale.value, {
      hour: "2-digit",
      minute: "2-digit",
    }),
);

interface PickemDayGroup {
  date: Date;
  matches: Match[];
}

const matchesByDay = computed(() => {
  if (!tournament.value?.matches) return [];

  const validMatches = tournament.value.matches.filter(
    (m) => m.participants?.length === 2 && m.beginAt,
  );

  const grouped = new Map<string, PickemDayGroup>();
  for (const match of validMatches) {
    const matchDate = new Date(match.beginAt!);
    const dayKey = matchDate.toDateString();
    const existing = grouped.get(dayKey);
    if (existing) {
      existing.matches.push(match);
    } else {
      grouped.set(dayKey, { date: matchDate, matches: [match] });
    }
  }

  return [...grouped.values()]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((group) => ({
      ...group,
      matches: group.matches.sort(
        (a, b) => new Date(a.beginAt!).getTime() - new Date(b.beginAt!).getTime(),
      ),
    }));
});

const activeTab = computed<PickemDetailTab>(() =>
  route.query.tab === "leaderboard" ? "leaderboard" : "pickem",
);

const topLeaderboard = computed(() => (leaderboard.value ?? []).slice(0, LEADERBOARD_TOP));
const hasScoredPicks = computed(() =>
  [...(picks.value?.values() ?? [])].some((pick) => pick.scored),
);

function tabTo(tab: PickemDetailTab) {
  const path = localePath(`/game/pickems/${tournamentId.value}`);
  switch (tab) {
    case "pickem":
      return { path };
    case "leaderboard":
      return { path, query: { tab: "leaderboard" } };
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

const submittingMatchId = ref<string | null>(null);

function loginRedirectPath() {
  return {
    path: localePath("/login"),
    query: { redirect: localePath(`/game/pickems/${tournamentId.value}`) },
  };
}

function matchScoreLabel(match: Match): string | null {
  const status = resolveMatchDiscoveryStatus(match);
  if (!shouldShowMatchScores(status)) return null;

  const scoreA = displayMatchScore(
    getMatchParticipantScore(match.results, match.participants?.[0]?.id),
    status,
  );
  const scoreB = displayMatchScore(
    getMatchParticipantScore(match.results, match.participants?.[1]?.id),
    status,
  );
  if (scoreA == null && scoreB == null) return null;
  return `${scoreA ?? "–"}–${scoreB ?? "–"}`;
}

function matchCenterPrimary(match: Match): string | null {
  const score = matchScoreLabel(match);
  if (score) return score;
  if (!match.beginAt) return null;
  return pickemTimeDf.value.format(new Date(match.beginAt));
}

function openMatchLabel(match: Match): string {
  return t("page.game.pickems.detail.openMatch", {
    teamA: match.participants?.[0]?.team.name ?? t("components.match.tbd"),
    teamB: match.participants?.[1]?.team.name ?? t("components.match.tbd"),
  });
}

function teamButtonColor(
  match: Match,
  participantId: string | undefined,
): "neutral" | "success" | "error" | "primary" {
  if (!participantId || !picks.value) return "neutral";
  const pick = picks.value.get(match.id);
  if (!pick || pick.pickedParticipant !== participantId) return "neutral";

  const outcome = getPickOutcome(match, pick);
  if (outcome === "correct") return "success";
  if (outcome === "incorrect") return "error";
  return "primary";
}

async function pickTeam(matchId: string, participantId: string) {
  if (!participantId || submittingMatchId.value) return;

  if (!user.value) {
    await navigateTo(loginRedirectPath());
    return;
  }

  submittingMatchId.value = matchId;
  try {
    await updatePickemForMatch(matchId, participantId);
    posthog?.capture("pickem_pick_submitted", {
      match_id: matchId,
      tournament_id: tournamentId.value,
    });
    toast.add({
      title: t("page.game.pickems.detail.pickSaved"),
      color: "success",
    });
    await Promise.all([refreshPicks(), refreshPersonalRank(), refreshLeaderboard()]);
  } catch (error) {
    toast.add({
      title: pickemApiErrorMessage(error, t("page.game.pickems.detail.pickFailed")),
      color: "error",
    });
  } finally {
    submittingMatchId.value = null;
  }
}

onMounted(() => {
  posthog?.capture("pickem_tournament_opened", { tournament_id: tournamentId.value });
});

const trackedResults = ref(false);
const trackedLeaderboard = ref(false);

watch(hasScoredPicks, (scored) => {
  if (scored && !trackedResults.value) {
    trackedResults.value = true;
    posthog?.capture("pickem_results_viewed", { tournament_id: tournamentId.value });
  }
});

watch(
  activeTab,
  (tab) => {
    if (tab === "leaderboard" && !trackedLeaderboard.value) {
      trackedLeaderboard.value = true;
      posthog?.capture("pickem_leaderboard_viewed", { tournament_id: tournamentId.value });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>
        <template v-if="tournament">
          {{ t("page.game.pickems.detail.title", { tournament: displayName }) }}
        </template>
        <template v-else>
          {{ t("page.game.pickems.title") }}
        </template>
      </template>
    </SHubPageHeader>

    <SCard v-if="tournamentPending && !tournament" class="p-4" aria-live="polite">
      <div class="flex flex-col gap-3 animate-pulse">
        <USkeleton class="h-6 w-48 mx-auto" />
        <USkeleton class="h-16 w-full" />
        <USkeleton class="h-16 w-full" />
      </div>
    </SCard>

    <SCard v-else-if="tournamentError">
      <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-4xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.game.pickems.detail.error") }}
        </p>
        <UButton variant="outline" @click="refreshTournament()">
          {{ t("page.game.pickems.detail.retry") }}
        </UButton>
      </div>
    </SCard>

    <template v-else-if="tournament">
      <SCard
        v-if="sessionReady && !isSignedIn"
        class="border border-primary/30 bg-elevated p-4 md:p-5"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-pretty text-muted">
            {{ t("page.game.pickems.detail.signInPrompt") }}
          </p>
          <UButton :to="loginRedirectPath()" color="primary">
            {{ t("page.game.pickems.detail.signInCta") }}
          </UButton>
        </div>
      </SCard>

      <div class="w-full flex flex-row gap-2">
        <UButton
          :to="tabTo('pickem')"
          :label="t('page.game.pickems.detail.tabs.pickem')"
          :variant="activeTab === 'pickem' ? 'solid' : 'soft'"
          color="neutral"
          class="w-full items-center justify-center"
        />
        <UButton
          :to="tabTo('leaderboard')"
          :label="t('page.game.pickems.detail.tabs.leaderboard')"
          :variant="activeTab === 'leaderboard' ? 'solid' : 'soft'"
          color="neutral"
          class="w-full items-center justify-center"
        />
      </div>

      <section
        v-if="activeTab === 'leaderboard'"
        class="w-full"
        aria-labelledby="pickem-leaderboard-title"
      >
        <h2 id="pickem-leaderboard-title" class="sr-only">
          {{ t("page.game.pickems.detail.tabs.leaderboard") }}
        </h2>
        <SCard class="p-4">
          <p v-if="isSignedIn && personalRank?.rank != null" class="text-sm text-muted mb-3">
            {{
              t("page.game.pickems.detail.leaderboard.yourRank", {
                rank: personalRank.rank,
                total: personalRank.total,
                points: personalRank.points,
              })
            }}
          </p>
          <p
            v-else-if="isSignedIn && personalRank && topLeaderboard.length > 0"
            class="text-sm text-muted mb-3"
          >
            {{ t("page.game.pickems.detail.leaderboard.noRankYet") }}
          </p>
          <div v-if="leaderboardPending && topLeaderboard.length === 0" class="flex flex-col gap-2">
            <USkeleton v-for="i in 3" :key="i" class="h-6 w-full" />
          </div>
          <ol v-else-if="topLeaderboard.length > 0" class="flex flex-col gap-1">
            <li
              v-for="(entry, index) in topLeaderboard"
              :key="entry.userId"
              class="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 text-sm py-1 border-b border-default last:border-b-0"
              :class="entry.userId === user?.id ? 'text-highlighted font-medium' : ''"
            >
              <span class="tabular-nums text-muted">{{ index + 1 }}</span>
              <span class="truncate" translate="no">{{ entry.userName }}</span>
              <span class="tabular-nums">
                {{ t("page.game.pickems.detail.leaderboard.points", { points: entry.points }) }}
              </span>
            </li>
          </ol>
          <p v-else class="text-sm text-muted">
            {{ t("page.game.pickems.detail.leaderboard.empty") }}
          </p>
        </SCard>
      </section>

      <SCard v-else-if="matchesByDay.length === 0">
        <div class="flex flex-col items-center gap-2 py-12 px-4 text-center">
          <p class="text-sm text-muted text-pretty">
            {{ t("page.game.pickems.detail.emptyMatches") }}
          </p>
        </div>
      </SCard>

      <div v-else class="w-full flex flex-col">
        <div
          v-for="dayGroup in matchesByDay"
          :key="dayGroup.date.toDateString()"
          class="w-full flex flex-col"
        >
          <h2 class="flex h-row min-h-row items-end pb-1 pl-2 text-sm font-medium text-toned">
            {{ formatDayHeaderDate(dayGroup.date, locale) }}
          </h2>
          <SCard flush-bottom>
            <SListItem
              v-for="match in dayGroup.matches"
              :id="`pickem-match-${match.id}`"
              :key="match.id"
              size="default"
              divider
            >
              <div class="grid w-full grid-cols-3 items-stretch gap-2">
                <UButton
                  variant="ghost"
                  class="w-full justify-center truncate"
                  :disabled="
                    isMatchLockedForPickem(match) || submittingMatchId === match.id || picksPending
                  "
                  :loading="submittingMatchId === match.id"
                  :color="teamButtonColor(match, match.participants?.[0]?.id)"
                  @click="pickTeam(match.id, match.participants?.[0]?.id || '')"
                >
                  {{ match.participants?.[0]?.team.name }}
                </UButton>
                <NuxtLink
                  :to="localePath(`/matches/${match.id}`)"
                  class="flex min-w-0 self-stretch flex-col items-center justify-center text-xs text-muted hover:text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  :aria-label="openMatchLabel(match)"
                >
                  <span v-if="matchCenterPrimary(match)" class="tabular-nums">
                    {{ matchCenterPrimary(match) }}
                  </span>
                  <span v-if="match.numberOfGames" class="tabular-nums">
                    {{ t("page.match.detail.format", { count: match.numberOfGames }) }}
                  </span>
                </NuxtLink>
                <UButton
                  variant="ghost"
                  class="w-full justify-center truncate"
                  :disabled="
                    isMatchLockedForPickem(match) || submittingMatchId === match.id || picksPending
                  "
                  :loading="submittingMatchId === match.id"
                  :color="teamButtonColor(match, match.participants?.[1]?.id)"
                  @click="pickTeam(match.id, match.participants?.[1]?.id || '')"
                >
                  {{ match.participants?.[1]?.team.name }}
                </UButton>
              </div>
            </SListItem>
          </SCard>
        </div>
      </div>
    </template>
  </div>
</template>
