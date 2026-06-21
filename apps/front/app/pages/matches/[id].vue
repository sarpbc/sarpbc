<script lang="ts" setup>
import type { Match, MatchDetailResponse } from "~/types/matches";
import { getResultParticipantId } from "~/types/matches";
import type { TournamentParticipant } from "~/types/tournament";

const { t, locale } = useI18n();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();

const matchId = computed(() => route.params.id as string);

const {
  data: matchDetail,
  pending,
  error,
  refresh,
} = await useLazyAsyncData<MatchDetailResponse | null>(
  () => `match-${matchId.value}`,
  async () => {
    try {
      return await getMatchById(matchId.value);
    } catch (err: unknown) {
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;

      if (statusCode === 404) {
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

const participants = computed(() => match.value?.participants ?? []);
const teamA = computed(() => participants.value[0]);
const teamB = computed(() => participants.value[1]);

function participantName(participant?: TournamentParticipant) {
  return participant?.team.name ?? t("page.match.detail.unknownTeam");
}

function tournamentLabel(currentMatch: Match) {
  const league = currentMatch.tournament?.league?.name;
  const name = currentMatch.tournament?.name;
  if (league && name) return `${league} ${name}`;
  return name ?? t("page.match.detail.unknownTournament");
}

function getParticipantScore(currentMatch: Match, participantId: string): number | null {
  if (!currentMatch.results?.length) return null;
  const result = currentMatch.results.find(
    (r) => getResultParticipantId(r.participant) === participantId,
  );
  return result?.score ?? null;
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

function getScoreColorClass(participantId: string): string {
  const winnerId = winnerParticipantId.value;
  if (!winnerId) return "text-muted";
  return winnerId === participantId ? "text-success" : "text-error";
}

const matchStatus = computed(() => {
  if (!match.value) return "upcoming" as const;

  const now = Date.now();
  const beginAt = match.value.beginAt ? new Date(match.value.beginAt).getTime() : null;

  if (match.value.endAt || match.value.status === "finished") {
    return "finished" as const;
  }

  if (beginAt !== null && beginAt <= now) {
    return "live" as const;
  }

  return "upcoming" as const;
});

const dateTimeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);

const statusLabel = computed(() => {
  switch (matchStatus.value) {
    case "live":
      return t("page.match.detail.status.live");
    case "finished":
      return t("page.match.detail.status.finished");
    case "upcoming":
      return t("page.match.detail.status.upcoming");
    default: {
      const _exhaustive: never = matchStatus.value;
      return _exhaustive;
    }
  }
});

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

watch(
  [seoTitle, seoDescription],
  () => {
    setPageSeo({
      title: seoTitle.value,
      description: seoDescription.value,
    });
  },
  { immediate: true },
);

function tournamentMatchesPath(tournamentId: string) {
  return `/tournaments/${tournamentId}/matches`;
}
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div v-if="pending" class="w-full flex flex-col gap-4" aria-live="polite">
      <UiCrossCard class="h-24">
        <div class="w-full p-4 animate-pulse flex flex-col gap-3">
          <div class="h-3 w-48 rounded bg-elevated" />
          <div class="h-8 w-full max-w-md rounded bg-elevated mx-auto" />
          <div class="h-3 w-32 rounded bg-elevated mx-auto" />
        </div>
      </UiCrossCard>
      <UiCard class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <div class="h-24 rounded bg-elevated" />
          <div class="h-24 rounded bg-elevated" />
        </div>
      </UiCard>
      <UiCard class="p-4">
        <div class="h-40 rounded bg-elevated animate-pulse" />
      </UiCard>
    </div>

    <UiCard v-else-if="error">
      <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-4xl text-muted" />
        <p class="text-sm text-muted">
          {{ t("page.match.detail.error") }}
        </p>
        <UButton variant="outline" @click="refresh()">
          {{ t("page.match.detail.retry") }}
        </UButton>
      </div>
    </UiCard>

    <template v-else-if="match">
      <UiCrossCard class="min-h-14">
        <div class="w-full flex flex-col items-center gap-2 p-4 text-center">
          <ULink
            v-if="match.tournament"
            :to="$localePath(tournamentMatchesPath(match.tournament.id))"
            class="text-sm text-muted hover:text-highlighted"
          >
            {{ tournamentLabel(match) }}
          </ULink>

          <div
            class="flex flex-wrap items-center justify-center gap-3 text-xl md:text-2xl font-bold tracking-tight"
          >
            <ULink
              v-if="teamA?.team.slug"
              :to="$localePath(`/team/${teamA.team.slug}`)"
              class="hover:underline"
            >
              {{ participantName(teamA) }}
            </ULink>
            <span v-else>{{ participantName(teamA) }}</span>

            <template v-if="matchStatus === 'finished' || matchStatus === 'live'">
              <span
                class="font-mono tabular-nums"
                :class="teamA ? getScoreColorClass(teamA.id) : 'text-muted'"
              >
                {{ teamA ? (getParticipantScore(match, teamA.id) ?? "-") : "-" }}
              </span>
              <span class="text-muted font-normal text-base">vs</span>
              <span
                class="font-mono tabular-nums"
                :class="teamB ? getScoreColorClass(teamB.id) : 'text-muted'"
              >
                {{ teamB ? (getParticipantScore(match, teamB.id) ?? "-") : "-" }}
              </span>
            </template>
            <span v-else class="text-muted font-normal text-base">vs</span>

            <ULink
              v-if="teamB?.team.slug"
              :to="$localePath(`/team/${teamB.team.slug}`)"
              class="hover:underline"
            >
              {{ participantName(teamB) }}
            </ULink>
            <span v-else>{{ participantName(teamB) }}</span>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
            <UiBadgeLive v-if="matchStatus === 'live'" />
            <span v-else>{{ statusLabel }}</span>
            <span v-if="match.numberOfGames"
              >· {{ t("page.match.detail.format", { count: match.numberOfGames }) }}</span
            >
            <span v-if="match.beginAt">
              · {{ dateTimeFormatter.format(new Date(match.beginAt)) }}
            </span>
          </div>
        </div>
      </UiCrossCard>

      <UiCard class="p-4 md:p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="participant in participants"
            :key="participant.id"
            class="flex flex-col items-center gap-4 text-center"
          >
            <ULink
              v-if="participant.team.slug"
              :to="$localePath(`/team/${participant.team.slug}`)"
              class="flex flex-col items-center gap-3 hover:opacity-90"
            >
              <TeamImg
                :team-name="participant.team.name"
                :image-url="participant.team.imageUrl"
                size="md"
              />
              <span class="text-lg font-semibold">{{ participant.team.name }}</span>
            </ULink>
            <div v-else class="flex flex-col items-center gap-3">
              <TeamImg
                :team-name="participant.team.name"
                :image-url="participant.team.imageUrl"
                size="md"
              />
              <span class="text-lg font-semibold">{{ participant.team.name }}</span>
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
            <p v-else class="text-sm text-muted">
              {{ t("page.match.detail.noRoster") }}
            </p>
          </div>
        </div>
      </UiCard>

      <section class="w-full flex flex-col gap-3">
        <h2 class="text-sm font-medium text-toned pl-1">
          {{ t("page.match.detail.sections.recentForm") }}
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MatchTeamFormCard
            v-for="participant in participants"
            :key="participant.id"
            :team-name="participant.team.name"
            :team-form="teamForms[participant.team.id]"
          />
        </div>
      </section>

      <UiCard class="p-4 md:p-6">
        <h2 class="text-sm font-semibold mb-2">
          {{ t("page.match.detail.sections.gameStats") }}
        </h2>
        <p class="text-sm text-muted">
          {{ t("page.match.detail.gameStatsPlaceholder") }}
        </p>
        <p class="text-xs text-dimmed mt-2">
          {{ t("page.match.detail.gameStatsHint") }}
        </p>
      </UiCard>
    </template>
  </div>
</template>
