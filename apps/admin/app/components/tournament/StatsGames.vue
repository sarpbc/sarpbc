<script lang="ts" setup>
import type { TournamentMatchListItem, TournamentStatsGame } from "@sarpbc/types";
import { getApiErrorMessage, participantName } from "@sarpbc/utils";

const { games, matches, matchLabel, tournamentId } = defineProps<{
  tournamentId: string;
  matches: TournamentMatchListItem[];
  games: TournamentStatsGame[] | undefined;
  pending: boolean;
  failed: boolean;
  matchLabel: (match: TournamentMatchListItem) => string;
}>();

const emit = defineEmits<{ retry: []; removed: [] }>();

const { t } = useI18n();
const toast = useToast();

const toRemove = ref<TournamentStatsGame | null>(null);

const teamName = (match: TournamentMatchListItem, participantId: string): string => {
  const participant = match.participants.find((candidate) => candidate.id === participantId);

  return participant ? participantName(participant) : t("page.tournaments.statsGames.unknownTeam");
};

const gameLabel = (match: TournamentMatchListItem, game: TournamentStatsGame): string =>
  t("page.tournaments.statsGames.score", {
    blue: teamName(match, game.blueParticipantId),
    blueGoals: game.blueGoals,
    number: game.number,
    orange: teamName(match, game.orangeParticipantId),
    orangeGoals: game.orangeGoals,
  });

const rows = computed(() => {
  const loaded = games ?? [];

  return matches.flatMap((match) =>
    loaded
      .filter((game) => game.matchId === match.id)
      .map((game, index) => ({
        game,
        heading: index === 0 ? matchLabel(match) : null,
        key: `${match.id}:${game.number}`,
        label: gameLabel(match, game),
        removeLabel: t("page.tournaments.statsGames.remove", {
          match: matchLabel(match),
          number: game.number,
        }),
        url: `https://ballchasing.com/replay/${game.ballchasingId}`,
      })),
  );
});

const confirmMessage = (game: TournamentStatsGame): string => {
  const match = matches.find((candidate) => candidate.id === game.matchId);

  return t("page.tournaments.statsGames.confirm", {
    match: match ? matchLabel(match) : "",
    number: game.number,
  });
};

const remove = async (game: TournamentStatsGame): Promise<void> => {
  await removeStatsGame(tournamentId, game.matchId, game.number);
  toast.add({
    color: "success",
    title: t("page.tournaments.statsGames.removed", { number: game.number }),
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
      <SbButton
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
          <ULink
            :to="row.url"
            target="_blank"
            rel="noopener noreferrer"
            class="min-w-0 truncate tabular-nums"
          >
            {{ row.label }}
          </ULink>
          <SbButton
            variant="tertiary"
            danger
            size="sm"
            icon="i-fluent-delete-24-regular"
            :aria-label="row.removeLabel"
            @click="toRemove = row.game"
          />
        </div>
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
  </div>
</template>
