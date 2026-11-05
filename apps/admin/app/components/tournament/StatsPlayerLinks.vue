<script lang="ts" setup>
import type { UnlinkedStatsPlayer } from "@sarpbc/types";
import { getApiErrorMessage } from "~/utils/apiError";

const props = defineProps<{
  tournamentId: string;
  /** Changes when an import finishes, which can add or link rows. */
  refreshKey: string | null;
}>();

const { t } = useI18n();
const toast = useToast();

const {
  data: players,
  pending,
  error,
  refresh,
} = await useLazyAsyncData(
  () => `admin-tournament-${props.tournamentId}-unlinked-stats-players`,
  () => getUnlinkedStatsPlayers(props.tournamentId),
  { server: false, watch: [() => props.tournamentId, () => props.refreshKey] },
);

const selected = ref<Record<string, string | undefined>>({});
const savingKey = ref<string | null>(null);

function keyOf(player: UnlinkedStatsPlayer): string {
  return `${player.platform}:${player.platformId}`;
}

function rosterOptions(player: UnlinkedStatsPlayer) {
  return player.roster.map((member) => ({ value: member.id, label: member.name }));
}

async function save(player: UnlinkedStatsPlayer) {
  const key = keyOf(player);
  const playerId = selected.value[key];
  if (!playerId) return;
  savingKey.value = key;
  try {
    await linkStatsPlayer(props.tournamentId, {
      platform: player.platform,
      platformId: player.platformId,
      playerId,
    });
    toast.add({
      title: t("page.tournaments.statsLinks.saved", { name: player.name }),
      color: "success",
    });
    delete selected.value[key];
    await refresh();
  } catch (saveError) {
    toast.add({
      title: t("page.tournaments.statsLinks.saveError"),
      description: getApiErrorMessage(saveError) ?? undefined,
      color: "error",
    });
  } finally {
    savingKey.value = null;
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-medium">{{ t("page.tournaments.statsLinks.title") }}</h3>
      <p class="text-sm text-muted">{{ t("page.tournaments.statsLinks.hint") }}</p>
    </div>

    <p v-if="pending && !players" class="text-sm text-muted" aria-live="polite">
      {{ t("page.tournaments.statsLinks.loading") }}
    </p>

    <div v-else-if="error && !players" class="flex flex-col items-start gap-2">
      <p class="text-sm text-error">{{ t("page.tournaments.statsLinks.loadError") }}</p>
      <UButton
        size="sm"
        variant="soft"
        :label="t('page.tournaments.statsLinks.retry')"
        @click="refresh()"
      />
    </div>

    <p v-else-if="!players?.length" class="text-sm text-muted">
      {{ t("page.tournaments.statsLinks.empty") }}
    </p>

    <ul v-else class="divide-y divide-default border-y border-default">
      <li
        v-for="player in players"
        :key="keyOf(player)"
        class="flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <div class="flex min-w-0 flex-col">
          <span class="truncate text-highlighted">{{ player.name }}</span>
          <span class="truncate text-muted">
            {{
              t(
                "page.tournaments.statsLinks.meta",
                {
                  team: player.team.name,
                  count: player.games,
                  platform: player.platform,
                  id: player.platformId,
                },
                player.games,
              )
            }}
          </span>
        </div>
        <form class="flex items-center gap-2" @submit.prevent="save(player)">
          <USelect
            v-model="selected[keyOf(player)]"
            :items="rosterOptions(player)"
            value-key="value"
            label-key="label"
            class="w-48"
            :placeholder="
              player.roster.length
                ? t('page.tournaments.statsLinks.choose')
                : t('page.tournaments.statsLinks.noRoster')
            "
            :aria-label="t('page.tournaments.statsLinks.playerFor', { name: player.name })"
            :disabled="!player.roster.length || savingKey !== null"
          />
          <UButton
            type="submit"
            size="sm"
            :label="t('page.tournaments.statsLinks.save')"
            :loading="savingKey === keyOf(player)"
            :disabled="!selected[keyOf(player)] || savingKey !== null"
          />
        </form>
      </li>
    </ul>
  </div>
</template>
