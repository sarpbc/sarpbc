<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { Match } from "~/types/matches";
import type { PickemPickState } from "~/utils/pickems";
import {
  getPickOutcome,
  getTournamentDisplayName,
  getUnpickedOpenMatches,
  isMatchLockedForPickem,
} from "~/utils/pickems";

const LEADERBOARD_TOP = 10;

const route = useRoute();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const posthog = usePostHog();
const toast = useToast();
const localePath = useLocalePath();
const user = useUser();
const { attrs: cuelumeAttrs, pressClass, playCue } = useCuelume();

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

const pickemDf = computed(
  () =>
    new DateFormatter(locale.value, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
);

const dayHeaderDf = computed(
  () =>
    new DateFormatter(locale.value, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
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

const allValidMatches = computed(() => matchesByDay.value.flatMap((g) => g.matches));

const unpickedOpenMatches = computed(() =>
  getUnpickedOpenMatches(allValidMatches.value, picks.value),
);

const remainingCount = computed(() => unpickedOpenMatches.value.length);
const nextUnpickedId = computed(() => unpickedOpenMatches.value[0]?.id ?? null);

const topLeaderboard = computed(() => (leaderboard.value ?? []).slice(0, LEADERBOARD_TOP));
const hasScoredPicks = computed(() =>
  [...(picks.value?.values() ?? [])].some((pick) => pick.scored),
);
const showLeaderboard = computed(
  () => (leaderboard.value?.length ?? 0) > 0 || (personalRank.value?.total ?? 0) > 0,
);

const submittingMatchId = ref<string | null>(null);

function loginRedirectPath() {
  return {
    path: localePath("/login"),
    query: { redirect: localePath(`/game/pickems/${tournamentId.value}`) },
  };
}

function scrollToNextUnpicked() {
  const id = nextUnpickedId.value;
  if (!id || !import.meta.client) return;
  const el = document.getElementById(`pickem-match-${id}`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
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

function outcomeLabel(match: Match): string | null {
  const pick = picks.value?.get(match.id);
  const outcome = getPickOutcome(match, pick);
  switch (outcome) {
    case "correct":
      return t("page.game.pickems.detail.outcome.correct", { points: pick?.points ?? 5 });
    case "incorrect":
      return t("page.game.pickems.detail.outcome.incorrect");
    case "pending":
      return isMatchLockedForPickem(match)
        ? t("page.game.pickems.detail.outcome.locked")
        : t("page.game.pickems.detail.outcome.pending");
    default:
      return isMatchLockedForPickem(match) ? t("page.game.pickems.detail.outcome.locked") : null;
  }
}

async function pickTeam(matchId: string, participantId: string) {
  if (!participantId || submittingMatchId.value) return;

  if (!user.value) {
    await navigateTo(loginRedirectPath());
    return;
  }

  submittingMatchId.value = matchId;
  playCue("loading");
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

watch([hasScoredPicks, showLeaderboard], ([scored, leaderboardVisible]) => {
  if (scored && !trackedResults.value) {
    trackedResults.value = true;
    posthog?.capture("pickem_results_viewed", { tournament_id: tournamentId.value });
  }
  if (leaderboardVisible && !trackedLeaderboard.value) {
    trackedLeaderboard.value = true;
    posthog?.capture("pickem_leaderboard_viewed", { tournament_id: tournamentId.value });
  }
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SCrossCard class="w-full min-h-row-header">
      <div class="w-full flex flex-col items-center justify-center gap-1 px-4 py-3 text-center">
        <h1 class="text-xl font-semibold text-balance">
          <template v-if="tournament">
            {{ t("page.game.pickems.detail.title", { tournament: displayName }) }}
          </template>
          <template v-else>
            {{ t("page.game.pickems.title") }}
          </template>
        </h1>
        <p
          v-if="tournament && sessionReady && isSignedIn && remainingCount > 0"
          class="text-sm text-muted"
        >
          {{ t("page.game.pickems.detail.remaining", { count: remainingCount }) }}
          <button
            type="button"
            class="ml-1 text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            @click="scrollToNextUnpicked"
          >
            {{ t("page.game.pickems.detail.jumpToNext") }}
          </button>
        </p>
        <p
          v-else-if="tournament && sessionReady && isSignedIn && remainingCount === 0"
          class="text-sm text-muted"
        >
          {{ t("page.game.pickems.detail.allCaughtUp") }}
        </p>
      </div>
    </SCrossCard>

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

      <section
        v-if="showLeaderboard || leaderboardPending || personalRank"
        class="w-full flex flex-col gap-3"
        aria-labelledby="pickem-leaderboard-title"
      >
        <h2 id="pickem-leaderboard-title" class="text-sm font-medium text-toned pl-1">
          {{ t("page.game.pickems.detail.leaderboard.title") }}
        </h2>
        <SCard class="p-4">
          <p v-if="isSignedIn && personalRank" class="text-sm text-muted mb-3">
            <template v-if="personalRank.rank != null">
              {{
                t("page.game.pickems.detail.leaderboard.yourRank", {
                  rank: personalRank.rank,
                  total: personalRank.total,
                  points: personalRank.points,
                })
              }}
            </template>
            <template v-else>
              {{ t("page.game.pickems.detail.leaderboard.noRankYet") }}
            </template>
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

      <SCard class="w-full">
        <div v-if="matchesByDay.length > 0" class="w-full flex flex-col gap-4 p-4">
          <div
            v-for="dayGroup in matchesByDay"
            :key="dayGroup.date.toDateString()"
            class="w-full flex flex-col gap-2"
          >
            <div class="flex items-center justify-center py-2">
              <h2 class="text-lg font-medium">
                {{ dayHeaderDf.format(dayGroup.date) }}
              </h2>
            </div>
            <div
              v-for="match in dayGroup.matches"
              :id="`pickem-match-${match.id}`"
              :key="match.id"
              class="w-full flex flex-col gap-1 border border-default p-2"
            >
              <div class="grid grid-cols-3 items-center justify-between gap-2">
                <UButton
                  variant="soft"
                  class="flex items-center justify-center col-span-1 min-h-10"
                  :class="pressClass"
                  :disabled="
                    isMatchLockedForPickem(match) || submittingMatchId === match.id || picksPending
                  "
                  :loading="submittingMatchId === match.id"
                  :color="teamButtonColor(match, match.participants?.[0]?.id)"
                  v-bind="cuelumeAttrs.pressRelease"
                  @click="pickTeam(match.id, match.participants?.[0]?.id || '')"
                >
                  {{ match.participants?.[0]?.team.name }}
                </UButton>
                <div class="flex flex-col items-center justify-evenly col-span-1 text-sm">
                  <span v-if="match.beginAt" class="tabular-nums text-muted">
                    {{ pickemDf.format(new Date(match.beginAt)) }}
                  </span>
                  <span class="text-muted">vs</span>
                </div>
                <UButton
                  variant="soft"
                  class="flex items-center justify-center col-span-1 min-h-10"
                  :class="pressClass"
                  :disabled="
                    isMatchLockedForPickem(match) || submittingMatchId === match.id || picksPending
                  "
                  :loading="submittingMatchId === match.id"
                  :color="teamButtonColor(match, match.participants?.[1]?.id)"
                  v-bind="cuelumeAttrs.pressRelease"
                  @click="pickTeam(match.id, match.participants?.[1]?.id || '')"
                >
                  {{ match.participants?.[1]?.team.name }}
                </UButton>
              </div>
              <p
                v-if="outcomeLabel(match)"
                class="text-xs text-center text-muted"
                :class="{
                  'text-success': getPickOutcome(match, picks?.get(match.id)) === 'correct',
                  'text-error': getPickOutcome(match, picks?.get(match.id)) === 'incorrect',
                }"
              >
                {{ outcomeLabel(match) }}
              </p>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col items-center gap-2 py-12 px-4 text-center">
          <p class="text-sm text-muted text-pretty">
            {{ t("page.game.pickems.detail.emptyMatches") }}
          </p>
        </div>
      </SCard>
    </template>
  </div>
</template>
