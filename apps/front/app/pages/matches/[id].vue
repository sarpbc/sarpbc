<script lang="ts" setup>
import type { Match, MatchDetailResponse } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import type { TournamentParticipant } from "~/types/tournament";
import {
  MATCH_DISCOVERY_FROM_QUERY,
  parseMatchDiscoverySource,
  resolveMatchDiscoveryStatus,
} from "~/utils/matchDiscoveryAnalytics";
import { getApiErrorStatus } from "~/utils/apiError";

const { t, locale } = useI18n();
const route = useRoute();
const { setPageSeo, getCanonicalUrl } = useSarpbcSeo();

const matchId = computed(() => route.params.id as string);
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
  () => `match-${matchId.value}`,
  async () => {
    try {
      return await getMatchById(matchId.value);
    } catch (err: unknown) {
      if (getApiErrorStatus(err) === 404) {
        throw createError({
          statusCode: 404,
          message: t("page.match.detail.notFound"),
        });
      }

      throw err;
    }
  },
  {
    watch: [matchId],
    default: () => null,
  },
);

const match = computed(() => matchDetail.value?.match ?? null);
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

function tournamentLabel(currentMatch: Match) {
  const league = currentMatch.tournament?.league?.name;
  const name = currentMatch.tournament?.name;
  if (league && name) return `${league} ${name}`;
  return name ?? t("page.match.detail.unknownTournament");
}

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

watch(
  () => {
    if (!match.value || match.value.id !== matchId.value) {
      return null;
    }
    return `${matchId.value}:${discoverySource.value ?? ""}`;
  },
  (key) => {
    if (!key || !match.value) {
      return;
    }

    trackMatchDetailViewed({
      matchId: matchId.value,
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
    tournament: tournamentLabel(match.value),
  });
});

const seoDescription = computed(() => {
  if (!match.value || !teamA.value || !teamB.value) {
    return t("page.match.detail.seoDescriptionDefault");
  }

  const tournament = tournamentLabel(match.value);
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
  [seoTitle, seoDescription, matchId, match],
  () => {
    setPageSeo({
      title: seoTitle.value,
      description: seoDescription.value,
      image: match.value ? getMatchOgImageUrl(matchId.value) : undefined,
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
        <div
          class="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 px-2 py-4 text-base font-semibold tracking-tight sm:gap-x-4 sm:px-4 md:py-0 lg:text-xl"
        >
          <MatchTeamResult
            :participant="teamA"
            :score="teamA ? getParticipantScore(match, teamA.id) : null"
            :winner="teamA && winnerParticipantId ? winnerParticipantId === teamA.id : undefined"
            :match-status="matchStatus"
            class="min-w-0"
          />

          <MatchInformation :match="match" :match-status="matchStatus" />

          <MatchTeamResult
            :participant="teamB"
            :score="teamB ? getParticipantScore(match, teamB.id) : null"
            :winner="teamB && winnerParticipantId ? winnerParticipantId === teamB.id : undefined"
            :match-status="matchStatus"
            class="min-w-0"
          />
        </div>
      </SCrossCard>

      <template v-if="!isBothTeamsTbd">
        <PickemMatchCta :match="match" :match-status="matchStatus" />

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
