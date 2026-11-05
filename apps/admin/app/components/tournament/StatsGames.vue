<script lang="ts" setup>
import type { TournamentMatchListItem, TournamentStatsGame } from "@sarpbc/types";
import { getApiErrorMessage } from "~/utils/apiError";

const props = defineProps<{
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

const rows = computed(() => {
  const games = props.games ?? [];
  return props.matches.flatMap((match) =>
    games
      .filter((game) => game.matchId === match.id)
      .map((game, index) => ({
        key: `${match.id}:${game.number}`,
        heading: index === 0 ? props.matchLabel(match) : null,
        label: gameLabel(match, game),
        url: `https://ballchasing.com/replay/${game.ballchasingId}`,
        removeLabel: t("page.tournaments.statsGames.remove", {
          number: game.number,
          match: props.matchLabel(match),
        }),
        game,
      })),
  );
});

function teamName(match: TournamentMatchListItem, participantId: string): string {
  return (
    match.participants.find((participant) => participant.id === participantId)?.team.name ??
    t("page.tournaments.statsGames.unknownTeam")
  );
}

function gameLabel(match: TournamentMatchListItem, game: TournamentStatsGame): string {
  return t("page.tournaments.statsGames.score", {
    number: game.number,
    blue: teamName(match, game.blueParticipantId),
    blueGoals: game.blueGoals,
    orange: teamName(match, game.orangeParticipantId),
    orangeGoals: game.orangeGoals,
  });
}

function confirmMessage(game: TournamentStatsGame): string {
  const match = props.matches.find((candidate) => candidate.id === game.matchId);
  return t("page.tournaments.statsGames.confirm", {
    number: game.number,
    match: match ? props.matchLabel(match) : "",
  });
}

async function remove(game: TournamentStatsGame): Promise<boolean> {
  try {
    await removeStatsGame(props.tournamentId, game.matchId, game.number);
    toast.add({
      title: t("page.tournaments.statsGames.removed", { number: game.number }),
      color: "success",
    });
    return true;
  } catch (error) {
    toast.add({
      title: t("page.tournaments.statsGames.removeError"),
      description: getApiErrorMessage(error) ?? undefined,
      color: "error",
    });
    return false;
  }
}
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
      <UButton
        size="sm"
        variant="soft"
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
          <UButton
            size="xs"
            color="error"
            variant="ghost"
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
