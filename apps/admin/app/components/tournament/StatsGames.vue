<script lang="ts" setup>
import type { StatsGameReplay, TournamentMatchListItem, TournamentStatsGame } from "@sarpbc/types";
import { participantName } from "@sarpbc/utils";

interface ReplayTarget {
  game: TournamentStatsGame;
  replay: StatsGameReplay;
  position: number;
}

const { games, matches, matchLabel, tournamentId } = defineProps<{
  tournamentId: string;
  matches: TournamentMatchListItem[];
  games: TournamentStatsGame[] | undefined;
  pending: boolean;
  failed: boolean;
  matchLabel: (match: TournamentMatchListItem) => string;
}>();

const emit = defineEmits<{ retry: []; removed: []; added: [] }>();

const { t } = useI18n();
const toast = useToast();

const toRemove = ref<TournamentStatsGame | null>(null);
const replayToRemove = ref<ReplayTarget | null>(null);
const toExtend = ref<TournamentStatsGame | null>(null);

const replayUrl = (replay: StatsGameReplay) =>
  `https://ballchasing.com/replay/${replay.ballchasingId}`;

const soleReplayUrl = (game: TournamentStatsGame) => {
  const [only, ...others] = game.replays;

  return only && others.length === 0 ? replayUrl(only) : null;
};

const teamName = (match: TournamentMatchListItem, participantId: string) => {
  const participant = match.participants.find((candidate) => candidate.id === participantId);

  return participant ? participantName(participant) : t("page.tournaments.statsGames.unknownTeam");
};

const gameLabel = (match: TournamentMatchListItem, game: TournamentStatsGame) =>
  t("page.tournaments.statsGames.score", {
    blue: teamName(match, game.blueParticipantId),
    blueGoals: game.blueGoals,
    number: game.number,
    orange: teamName(match, game.orangeParticipantId),
    orangeGoals: game.orangeGoals,
  });

const matchOf = (game: TournamentStatsGame) =>
  matches.find((candidate) => candidate.id === game.matchId);

const rows = computed(() => {
  const loaded = games ?? [];

  return matches.flatMap((match) =>
    loaded
      .filter((game) => game.matchId === match.id)
      .map((game, index) => ({
        addLabel: t("page.tournaments.statsGames.addReplayFor", {
          match: matchLabel(match),
          number: game.number,
        }),
        game,
        heading: index === 0 ? matchLabel(match) : null,
        key: `${match.id}:${game.number}`,
        label: gameLabel(match, game),
        removeLabel: t("page.tournaments.statsGames.remove", {
          match: matchLabel(match),
          number: game.number,
        }),
        replays:
          game.replays.length > 1
            ? game.replays.map((replay, replayIndex) => ({
                label: t("page.tournaments.statsGames.replay", {
                  blueGoals: replay.blueGoals,
                  orangeGoals: replay.orangeGoals,
                  position: replayIndex + 1,
                }),
                removeLabel: t("page.tournaments.statsGames.removeReplay", {
                  number: game.number,
                  position: replayIndex + 1,
                }),
                target: { game, position: replayIndex + 1, replay },
                url: replayUrl(replay),
              }))
            : [],
        url: soleReplayUrl(game),
      })),
  );
});

const confirmMessage = (game: TournamentStatsGame) => {
  const match = matchOf(game);

  return t("page.tournaments.statsGames.confirm", {
    match: match ? matchLabel(match) : "",
    number: game.number,
  });
};

const confirmReplayMessage = ({ game, position }: ReplayTarget) => {
  const match = matchOf(game);

  return t("page.tournaments.statsGames.confirmReplay", {
    match: match ? matchLabel(match) : "",
    number: game.number,
    position,
  });
};

const remove = async (game: TournamentStatsGame) => {
  await removeStatsGame(tournamentId, game.matchId, game.number);
  toast.add({
    color: "success",
    title: t("page.tournaments.statsGames.removed", { number: game.number }),
  });
};

const removeReplay = async ({ game, replay }: ReplayTarget) => {
  await removeStatsReplay(tournamentId, game.matchId, game.number, replay.ballchasingId);
  toast.add({
    color: "success",
    title: t("page.tournaments.statsGames.replayRemoved", { number: game.number }),
  });
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-medium">{{ t("page.tournaments.statsGames.title") }}</h3>
      <p class="text-sm text-muted">{{ t("page.tournaments.statsGames.hint") }}</p>
    </div>

    <p v-if="pending && !games" class="text-sm text-muted" aria-live="polite">
      {{ t("page.tournaments.statsGames.loading") }}
    </p>

    <div v-else-if="failed && !games" class="flex flex-col items-start gap-2">
      <p class="text-sm text-error">{{ t("page.tournaments.statsGames.loadError") }}</p>
      <SButton
        variant="secondary"
        size="sm"
        :label="t('page.tournaments.statsGames.retry')"
        @click="emit('retry')"
      />
    </div>

    <p v-else-if="rows.length === 0" class="text-sm text-muted">
      {{ t("page.tournaments.statsGames.empty") }}
    </p>

    <ul v-else class="border-y border-default">
      <li
        v-for="row in rows"
        :key="row.key"
        :class="['flex flex-col gap-1 text-sm', row.heading && 'border-t border-default pt-2']"
      >
        <h4 v-if="row.heading" class="font-medium text-highlighted">{{ row.heading }}</h4>
        <div class="flex flex-row items-center justify-between gap-2 pb-1">
          <SLink
            v-if="row.url"
            :to="row.url"
            target="_blank"
            rel="noopener noreferrer"
            class="min-w-0 truncate tabular-nums"
          >
            {{ row.label }}
          </SLink>
          <span v-else class="min-w-0 truncate tabular-nums">{{ row.label }}</span>
          <div class="flex shrink-0 flex-row gap-1">
            <SButton
              variant="tertiary"
              size="sm"
              icon="i-fluent-add-24-regular"
              :aria-label="row.addLabel"
              @click="toExtend = row.game"
            />
            <SButton
              variant="tertiary"
              danger
              size="sm"
              icon="i-fluent-delete-24-regular"
              :aria-label="row.removeLabel"
              @click="toRemove = row.game"
            />
          </div>
        </div>
        <ul v-if="row.replays.length > 0" class="flex flex-col gap-1 pb-1 pl-4">
          <li
            v-for="replay in row.replays"
            :key="replay.target.replay.ballchasingId"
            class="flex flex-row items-center justify-between gap-2"
          >
            <SLink
              :to="replay.url"
              target="_blank"
              rel="noopener noreferrer"
              class="min-w-0 truncate text-muted tabular-nums"
            >
              {{ replay.label }}
            </SLink>
            <SButton
              variant="tertiary"
              danger
              size="sm"
              icon="i-fluent-dismiss-24-regular"
              :aria-label="replay.removeLabel"
              @click="replayToRemove = replay.target"
            />
          </li>
        </ul>
      </li>
    </ul>

    <ConfirmDeleteModal
      v-model:target="toRemove"
      :title="t('page.tournaments.statsGames.confirmTitle')"
      :confirm-label="t('page.tournaments.statsGames.confirmButton')"
      :message="confirmMessage"
      :remove="remove"
      @deleted="emit('removed')"
    />

    <ConfirmDeleteModal
      v-model:target="replayToRemove"
      :title="t('page.tournaments.statsGames.confirmReplayTitle')"
      :confirm-label="t('page.tournaments.statsGames.confirmButton')"
      :message="confirmReplayMessage"
      :remove="removeReplay"
      @deleted="emit('removed')"
    />

    <TournamentStatsAddReplay
      v-model:target="toExtend"
      :tournament-id="tournamentId"
      :matches="matches"
      :match-label="matchLabel"
      @added="emit('added')"
    />
  </div>
</template>
