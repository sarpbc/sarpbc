<script lang="ts" setup>
import type { SelectItem } from "@nuxt/ui";
import type { StatsPlayerAccount, StatsRoster } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const props = defineProps<{
  tournamentId: string;
  /** Changes when games are imported, attached or removed, which can add or link rows. */
  refreshKey: string;
}>();

const { t } = useI18n();
const toast = useToast();

const {
  data: accounts,
  pending,
  error,
  refresh,
} = await useLazyAsyncData(
  () => `admin-tournament-${props.tournamentId}-stats-players`,
  () => getStatsPlayerAccounts(props.tournamentId),
  { server: false, watch: [() => props.tournamentId, () => props.refreshKey] },
);

const unlinked = computed(() => accounts.value?.players.filter((player) => !player.player) ?? []);
const linked = computed(() => accounts.value?.players.filter((player) => player.player) ?? []);

const selected = ref<Record<string, string | undefined>>({});
const editing = ref<string | null>(null);
const savingKey = ref<string | null>(null);

function keyOf(player: StatsPlayerAccount): string {
  return `${player.platform}:${player.platformId}`;
}

function rosterGroup(roster: StatsRoster): SelectItem[] {
  return [
    { type: "label", label: roster.teamName },
    ...roster.players.map((member) => ({ value: member.id, label: member.name })),
  ];
}

function rosterOptions(player: StatsPlayerAccount): SelectItem[][] {
  const rosters = accounts.value?.rosters ?? [];
  const own = rosters.filter((roster) => roster.participantId === player.team.participantId);
  const others = rosters.filter((roster) => roster.participantId !== player.team.participantId);
  return [...own, ...others].flatMap((roster) =>
    roster.players.length > 0 ? [rosterGroup(roster)] : [],
  );
}

function meta(player: StatsPlayerAccount): string {
  return t(
    "page.tournaments.statsLinks.meta",
    {
      team: player.team.name,
      count: player.games,
      platform: player.platform,
      id: player.platformId,
    },
    player.games,
  );
}

async function save(player: StatsPlayerAccount) {
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
    editing.value = null;
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

const ROW_CLASS =
  "flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4";
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-medium">{{ t("page.tournaments.statsLinks.title") }}</h3>
      <p class="text-sm text-muted">{{ t("page.tournaments.statsLinks.hint") }}</p>
    </div>

    <p v-if="pending && !accounts" class="text-sm text-muted" aria-live="polite">
      {{ t("page.tournaments.statsLinks.loading") }}
    </p>

    <div v-else-if="error && !accounts" class="flex flex-col items-start gap-2">
      <p class="text-sm text-error">{{ t("page.tournaments.statsLinks.loadError") }}</p>
      <UButton
        size="sm"
        variant="soft"
        :label="t('page.tournaments.statsLinks.retry')"
        @click="refresh()"
      />
    </div>

    <template v-else>
      <p v-if="unlinked.length === 0" class="text-sm text-muted">
        {{ t("page.tournaments.statsLinks.empty") }}
      </p>

      <ul v-else class="divide-y divide-default border-y border-default">
        <li v-for="player in unlinked" :key="keyOf(player)" :class="ROW_CLASS">
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-highlighted">{{ player.name }}</span>
            <span class="truncate text-muted">{{ meta(player) }}</span>
          </div>
          <form class="flex items-center gap-2" @submit.prevent="save(player)">
            <USelect
              v-model="selected[keyOf(player)]"
              :items="rosterOptions(player)"
              value-key="value"
              label-key="label"
              class="w-48"
              :placeholder="t('page.tournaments.statsLinks.choose')"
              :aria-label="t('page.tournaments.statsLinks.playerFor', { name: player.name })"
              :disabled="savingKey !== null"
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

      <div v-if="linked.length > 0" class="flex flex-col gap-1">
        <h4 class="text-sm font-medium">{{ t("page.tournaments.statsLinks.linkedTitle") }}</h4>
        <p class="text-sm text-muted">{{ t("page.tournaments.statsLinks.linkedHint") }}</p>
        <ul class="divide-y divide-default border-y border-default">
          <li v-for="player in linked" :key="keyOf(player)" :class="ROW_CLASS">
            <div class="flex min-w-0 flex-col">
              <span class="truncate text-highlighted">
                {{
                  t("page.tournaments.statsLinks.linkedTo", {
                    name: player.name,
                    player: player.player?.name,
                  })
                }}
              </span>
              <span class="truncate text-muted">{{ meta(player) }}</span>
            </div>
            <form
              v-if="editing === keyOf(player)"
              class="flex items-center gap-2"
              @submit.prevent="save(player)"
            >
              <USelect
                v-model="selected[keyOf(player)]"
                :items="rosterOptions(player)"
                value-key="value"
                label-key="label"
                class="w-48"
                :placeholder="t('page.tournaments.statsLinks.choose')"
                :aria-label="t('page.tournaments.statsLinks.playerFor', { name: player.name })"
                :disabled="savingKey !== null"
              />
              <UButton
                type="submit"
                size="sm"
                :label="t('page.tournaments.statsLinks.save')"
                :loading="savingKey === keyOf(player)"
                :disabled="
                  !selected[keyOf(player)] ||
                  selected[keyOf(player)] === player.player?.id ||
                  savingKey !== null
                "
              />
              <UButton
                size="sm"
                color="neutral"
                variant="ghost"
                :label="$t('common.cancel')"
                :disabled="savingKey !== null"
                @click="editing = null"
              />
            </form>
            <UButton
              v-else
              size="sm"
              variant="soft"
              :label="t('page.tournaments.statsLinks.change')"
              :aria-label="t('page.tournaments.statsLinks.changeFor', { name: player.name })"
              :disabled="savingKey !== null"
              @click="editing = keyOf(player)"
            />
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
