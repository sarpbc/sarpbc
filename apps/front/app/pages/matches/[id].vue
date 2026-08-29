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
      <SCrossCard class="min-h-row-triple">
        <div class="flex w-full flex-col items-center justify-center gap-3 px-4 py-5 animate-pulse">
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
      <div class="flex justify-center gap-2 animate-pulse">
        <div class="h-3 w-32 rounded bg-elevated" />
        <div class="h-3 w-12 rounded bg-elevated" />
      </div>
      <SCard class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <div class="h-24 rounded bg-elevated" />
          <div class="h-24 rounded bg-elevated" />
        </div>
      </SCard>
    </SHubPageBody>
  </div>

  <SCard v-else-if="error">
    <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
      <UIcon name="i-fluent-warning-24-regular" class="text-4xl text-muted" />
      <p class="text-sm text-muted">
        {{ t("page.match.detail.error") }}
      </p>
      <UButton variant="outline" @click="refresh()">
        {{ t("page.match.detail.retry") }}
      </UButton>
    </div>
  </SCard>

  <SHubPageBody v-else-if="match">
    <h1 class="sr-only">{{ scoreboardLabel }}</h1>

    <SCrossCard class="min-h-card-s">
      <div
        class="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center text-xl font-semibold tracking-tight"
      >
        <MatchTeamResult
          :participant="teamA"
          :score="teamA ? getParticipantScore(match, teamA.id) : null"
          :winner="teamA ? winnerParticipantId === teamA.id : undefined"
          class="min-w-0"
        />

        <MatchInformation :match="match" :match-status="matchStatus" />

        <MatchTeamResult
          :participant="teamB"
          :score="teamB ? getParticipantScore(match, teamB.id) : null"
          :winner="teamB ? winnerParticipantId === teamB.id : undefined"
          class="min-w-0"
        />
      </div>
    </SCrossCard>

    <template v-if="!isBothTeamsTbd">
      <PickemMatchCta :match="match" :match-status="matchStatus" />

      <SRail :title="t('page.match.detail.sections.rosters')">
        <SCard class="p-4 md:p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div
              v-for="participant in participants"
              :key="participant.id"
              class="flex flex-col items-center gap-4 text-center"
            >
              <SLink
                v-if="participant.team.slug"
                :to="$localePath(`/team/${participant.team.slug}`)"
                variant="muted"
                class="group flex min-h-10 min-w-10 flex-col items-center gap-3 p-2 -m-2 touch-manipulation hover:opacity-90 active:scale-[0.96]"
              >
                <TeamImg
                  :team-name="participant.team.name"
                  :image-url="participant.team.imageUrl"
                  :dark-mode-image-url="participant.team.darkModeImageUrl"
                  size="md"
                />
                <span class="max-w-full text-lg font-semibold text-balance">
                  {{ participant.team.name }}
                </span>
              </SLink>
              <div v-else class="flex flex-col items-center gap-3">
                <TeamImg
                  :team-name="participant.team.name"
                  :image-url="participant.team.imageUrl"
                  :dark-mode-image-url="participant.team.darkModeImageUrl"
                  size="md"
                />
                <span class="max-w-full text-lg font-semibold text-balance">
                  {{ participant.team.name }}
                </span>
              </div>

              <div
                v-if="participant.players && participant.players.length > 0"
                class="w-full flex flex-wrap justify-center gap-3"
              >
                <PlayerProfile
                  v-for="player in participant.players"
                  :key="player.id"
                  :player="player"
                  size="md"
                />
              </div>
              <p v-else class="text-sm text-pretty text-muted">
                {{ t("page.match.detail.noRoster") }}
              </p>
            </div>
          </div>
        </SCard>
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

      <SRail v-if="matchStatus !== 'finished'" :title="t('page.match.detail.sections.recentForm')">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <MatchTeamFormCard
            v-for="participant in participants"
            :key="participant.id"
            :team-name="participant.team.name"
            :team-form="teamForms[participant.team.id]"
          />
        </div>
      </SRail>
    </template>

    <DiscussionCommentThread target-type="match" :target-id="match.id" />
  </SHubPageBody>
</template>
