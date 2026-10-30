<script lang="ts" setup>
import type { Match, MatchDetailResponse } from "~/types/matches";
import {
  displayMatchScore,
  getMatchParticipantScore,
  shouldShowMatchScores,
} from "~/types/matches";
import type { TournamentParticipant } from "~/types/tournament";
import {
  MATCH_DISCOVERY_FROM_QUERY,
  parseMatchDiscoverySource,
  resolveMatchDiscoveryStatus,
} from "~/utils/matchDiscoveryAnalytics";
import { matchPath } from "@sarpbc/utils";
import { getApiErrorStatus } from "~/utils/apiError";
import { tournamentStageLabel } from "~/utils/tournamentStageLabel";

const { t, locale } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const { setPageSeo, getCanonicalUrl } = useSarpbcSeo();

const matchRef = computed(() => route.params.ref as string);
const { trackMatchDetailViewed } = useMatchDiscoveryAnalytics();
const discoverySource = computed(() =>
  parseMatchDiscoverySource(route.query[MATCH_DISCOVERY_FROM_QUERY]),
);

const {
  data: matchDetail,
  pending,
  error,
  refresh,
} = await useAsyncData<MatchDetailResponse | null>(
  () => `match-${matchRef.value}`,
  async () => {
    try {
      return await getMatchById(matchRef.value);
    } catch (err: unknown) {
      if (getApiErrorStatus(err) === 404) {
        return null;
      }

      throw err;
    }
  },
  {
    watch: [matchRef],
    default: () => null,
  },
);

if (!matchDetail.value) {
  throwEntityLoadError(error.value, {
    notFound: t("page.match.detail.notFound"),
    failed: t("page.match.detail.error"),
  });
}

const match = computed(() => matchDetail.value?.match ?? null);

const { publicId, slug } = matchDetail.value.match;
const canonicalPath = localePath(matchPath(publicId, slug));
if (route.path !== canonicalPath) {
  await navigateTo(
    { path: canonicalPath, query: route.query, hash: route.hash },
    { redirectCode: 301, replace: true },
  );
}
const teamForms = computed(() => matchDetail.value?.teamForms ?? {});
const headToHead = computed(() => matchDetail.value?.headToHead ?? null);

const participants = computed(() => match.value?.participants ?? []);
const teamA = computed(() => participants.value[0]);
const teamB = computed(() => participants.value[1]);

function participantName(participant?: TournamentParticipant) {
  return participant?.team.name ?? t("page.match.detail.unknownTeam");
}

function isTbdTeam(participant?: TournamentParticipant): boolean {
  return !participant?.team?.name?.trim();
}

const isBothTeamsTbd = computed(() => isTbdTeam(teamA.value) && isTbdTeam(teamB.value));

function getParticipantScore(currentMatch: Match, participantId: string): number | null {
  return getMatchParticipantScore(currentMatch.results, participantId);
}

const winnerParticipantId = computed(() => {
  if (!match.value || !teamA.value || !teamB.value) return null;

  if (match.value.winner?.id) {
    return match.value.winner.id;
  }

  const scoreA = getParticipantScore(match.value, teamA.value.id);
  const scoreB = getParticipantScore(match.value, teamB.value.id);

  if (scoreA === null || scoreB === null || scoreA === scoreB) {
    return null;
  }

  return scoreA > scoreB ? teamA.value.id : teamB.value.id;
});

const matchStatus = computed(() => {
  if (!match.value) {
    return "upcoming" as const;
  }
  return resolveMatchDiscoveryStatus(match.value);
});

const showScores = computed(() => shouldShowMatchScores(matchStatus.value));

const heroScoreA = computed(() =>
  match.value && teamA.value
    ? displayMatchScore(getParticipantScore(match.value, teamA.value.id), matchStatus.value)
    : "–",
);
const heroScoreB = computed(() =>
  match.value && teamB.value
    ? displayMatchScore(getParticipantScore(match.value, teamB.value.id), matchStatus.value)
    : "–",
);

function heroScoreClass(participantId: string | undefined): string {
  if (!winnerParticipantId.value) return "font-medium text-highlighted";
  return participantId === winnerParticipantId.value
    ? "font-medium text-highlighted"
    : "text-muted";
}

watch(
  () => (match.value ? `${match.value.id}:${discoverySource.value ?? ""}` : null),
  (key) => {
    if (!key || !match.value) {
      return;
    }

    trackMatchDetailViewed({
      matchId: match.value.id,
      status: matchStatus.value,
      source: discoverySource.value,
    });
  },
  { immediate: true },
);

const dateTimeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);

const seoTitle = computed(() => {
  if (!match.value || !teamA.value || !teamB.value) {
    return t("page.match.detail.seoTitleDefault");
  }

  return t("page.match.detail.seoTitle", {
    teamA: participantName(teamA.value),
    teamB: participantName(teamB.value),
    tournament: tournamentStageLabel(match.value.tournament),
  });
});

const seoDescription = computed(() => {
  if (!match.value || !teamA.value || !teamB.value) {
    return t("page.match.detail.seoDescriptionDefault");
  }

  const tournament = tournamentStageLabel(match.value.tournament);
  const teamAName = participantName(teamA.value);
  const teamBName = participantName(teamB.value);

  switch (matchStatus.value) {
    case "live":
      return t("page.match.detail.seoDescriptionLive", {
        teamA: teamAName,
        teamB: teamBName,
        tournament,
      });
    case "upcoming":
      return t("page.match.detail.seoDescriptionUpcoming", {
        teamA: teamAName,
        teamB: teamBName,
        tournament,
        date: match.value.beginAt
          ? dateTimeFormatter.value.format(new Date(match.value.beginAt))
          : "",
      });
    case "finished": {
      const scoreA = teamA.value ? getParticipantScore(match.value, teamA.value.id) : null;
      const scoreB = teamB.value ? getParticipantScore(match.value, teamB.value.id) : null;
      return t("page.match.detail.seoDescriptionFinished", {
        teamA: teamAName,
        teamB: teamBName,
        tournament,
        scoreA: scoreA ?? "-",
        scoreB: scoreB ?? "-",
      });
    }
    default: {
      const _exhaustive: never = matchStatus.value;
      return _exhaustive;
    }
  }
});

function getMatchOgImageUrl(id: string): string {
  const origin = new URL(getCanonicalUrl()).origin;
  return `${origin}/og/match/${id}.png?v=2`;
}

watch(
  [seoTitle, seoDescription, match],
  () => {
    setPageSeo({
      title: seoTitle.value,
      description: seoDescription.value,
      image: match.value ? getMatchOgImageUrl(match.value.id) : undefined,
    });
  },
  { immediate: true },
);

const scoreboardLabel = computed(() => {
  const a = participantName(teamA.value);
  const b = participantName(teamB.value);
  if (!match.value || matchStatus.value === "upcoming") {
    return `${a} vs ${b}`;
  }
  const scoreA = teamA.value ? (getParticipantScore(match.value, teamA.value.id) ?? "-") : "-";
  const scoreB = teamB.value ? (getParticipantScore(match.value, teamB.value.id) ?? "-") : "-";
  return `${a} ${scoreA} - ${scoreB} ${b}`;
});
</script>

<template>
  <div v-if="pending" aria-live="polite">
    <SHubPageBody>
      <div class="w-full flex min-w-0 flex-col">
        <SCrossCard class="min-h-row-triple">
          <div
            class="flex w-full flex-col items-center justify-center gap-3 px-4 py-5 animate-pulse"
          >
            <div class="size-8 rounded bg-elevated" />
            <div
              class="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3"
            >
              <div class="h-6 w-28 justify-self-end rounded bg-elevated" />
              <div class="h-7 w-14 justify-self-center rounded bg-elevated" />
              <div class="h-6 w-28 justify-self-start rounded bg-elevated" />
            </div>
          </div>
        </SCrossCard>
        <SRail>
          <SCard flush-top class="p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-px animate-pulse">
              <div class="h-24 rounded bg-elevated" />
              <div class="h-24 rounded bg-elevated" />
            </div>
          </SCard>
        </SRail>
      </div>
    </SHubPageBody>
  </div>

  <SHubPageBody v-else-if="error">
    <SCard class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.match.detail.error')" @retry="refresh()" />
    </SCard>
  </SHubPageBody>

  <SHubPageBody v-else-if="match">
    <div class="w-full flex min-w-0 flex-col">
      <h1 class="sr-only">{{ scoreboardLabel }}</h1>

      <SCrossCard class="min-h-row-triple h-row-grid">
        <div class="flex w-full flex-col items-center gap-4 px-2 py-4 sm:px-4">
          <div
            class="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 text-base sm:gap-x-6"
          >
            <MatchTeamResult
              :participant="teamA"
              :winner="teamA && winnerParticipantId ? winnerParticipantId === teamA.id : undefined"
              class="min-w-0"
            />

            <p
              v-if="showScores"
              class="flex items-center gap-2 text-4xl tabular-nums sm:gap-3"
              aria-hidden="true"
            >
              <span :class="heroScoreClass(teamA?.id)">{{ heroScoreA }}</span>
              <span class="text-dimmed">–</span>
              <span :class="heroScoreClass(teamB?.id)">{{ heroScoreB }}</span>
            </p>
            <p v-else class="text-sm text-muted" aria-hidden="true">
              {{ t("page.match.detail.versus") }}
            </p>

            <MatchTeamResult
              :participant="teamB"
              :winner="teamB && winnerParticipantId ? winnerParticipantId === teamB.id : undefined"
              class="min-w-0"
            />
          </div>

          <MatchInformation :match="match" :match-status="matchStatus" />
        </div>
      </SCrossCard>

      <template v-if="!isBothTeamsTbd">
        <PickemMatchCta :match="match" :match-status="matchStatus" />

        <SRail v-if="match.vods?.length" :title="t('page.match.detail.sections.vods')">
          <MatchVods :vods="match.vods" />
        </SRail>

        <SRail :title="t('page.match.detail.sections.rosters')">
          <MatchRosterTable :participants="participants" />
        </SRail>

        <SRail
          v-if="matchStatus !== 'finished' && headToHead && teamA && teamB"
          :title="t('page.match.detail.sections.headToHead')"
        >
          <MatchHeadToHeadCard
            :head-to-head="headToHead"
            :team-a-name="participantName(teamA)"
            :team-b-name="participantName(teamB)"
          />
        </SRail>

        <SRail
          v-if="matchStatus !== 'finished'"
          :title="t('page.match.detail.sections.recentForm')"
        >
          <SCard flush-top>
            <div class="grid grid-cols-1 items-stretch md:grid-cols-2">
              <MatchTeamFormCard
                v-for="(participant, index) in participants"
                :key="participant.id"
                :class="
                  index === 0
                    ? 'max-md:border-b max-md:border-default md:border-r md:border-default'
                    : undefined
                "
                :team-name="participant.team.name"
                :team-form="teamForms[participant.team.id]"
              />
            </div>
          </SCard>
        </SRail>
      </template>

      <SRail :title="t('components.discussion.heading')">
        <DiscussionCommentThread target-type="match" :target-id="match.id" flush-top />
      </SRail>
    </div>
  </SHubPageBody>
</template>
