<script lang="ts" setup>
import type { RankedPlayer, RankedTeam } from "~/utils/career/simulation";

const props = defineProps<{
  teams: RankedTeam[];
  players: RankedPlayer[];
}>();

const { t } = useI18n();

const activeTab = ref<"teams" | "players">("teams");

const topTeams = computed(() => props.teams.slice(0, 10));
const topPlayers = computed(() => props.players.slice(0, 20));

const userEntry = computed(() => props.players.find((player) => player.isUser) ?? null);
const userOutsideTop = computed(
  () => userEntry.value !== null && userEntry.value.rank > topPlayers.value.length,
);

const playerTeamEntry = computed(() => props.teams.find((team) => team.isPlayerTeam) ?? null);
const playerTeamOutsideTop = computed(
  () => playerTeamEntry.value !== null && playerTeamEntry.value.rank > topTeams.value.length,
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-semibold tracking-tight">
        {{ t("page.game.career.rankings.title") }}
      </h2>
      <div class="flex gap-1" role="tablist" :aria-label="t('page.game.career.rankings.title')">
        <UButton
          size="xs"
          role="tab"
          :aria-selected="activeTab === 'teams'"
          :variant="activeTab === 'teams' ? 'solid' : 'outline'"
          @click="activeTab = 'teams'"
        >
          {{ t("page.game.career.rankings.teams") }}
        </UButton>
        <UButton
          size="xs"
          role="tab"
          :aria-selected="activeTab === 'players'"
          :variant="activeTab === 'players' ? 'solid' : 'outline'"
          @click="activeTab = 'players'"
        >
          {{ t("page.game.career.rankings.players") }}
        </UButton>
      </div>
    </div>

    <ol v-if="activeTab === 'teams'" class="flex flex-col">
      <li
        v-for="entry in topTeams"
        :key="entry.team.id"
        class="flex items-center gap-2 border-b border-default px-2 py-1.5 text-sm last:border-b-0"
        :class="entry.isPlayerTeam ? 'bg-elevated font-semibold' : ''"
      >
        <span class="w-6 shrink-0 text-right text-xs text-muted tabular-nums">
          {{ entry.rank }}
        </span>
        <span class="min-w-0 flex-1 truncate">
          {{ entry.team.name }}
          <span v-if="entry.isPlayerTeam" class="text-xs text-primary">
            · {{ t("page.game.career.rankings.yourTeam") }}
          </span>
        </span>
        <span class="shrink-0 text-xs text-muted uppercase">
          {{ t(`page.game.career.onboarding.regions.${entry.team.region}`) }}
        </span>
        <span class="w-8 shrink-0 text-right text-xs tabular-nums">
          {{ Math.round(entry.rating) }}
        </span>
      </li>
      <li
        v-if="playerTeamOutsideTop && playerTeamEntry"
        class="mt-1 flex items-center gap-2 border border-default bg-elevated px-2 py-1.5 text-sm font-semibold"
      >
        <span class="w-6 shrink-0 text-right text-xs text-muted tabular-nums">
          {{ playerTeamEntry.rank }}
        </span>
        <span class="min-w-0 flex-1 truncate">
          {{ playerTeamEntry.team.name }}
          <span class="text-xs text-primary">· {{ t("page.game.career.rankings.yourTeam") }}</span>
        </span>
        <span class="w-8 shrink-0 text-right text-xs tabular-nums">
          {{ Math.round(playerTeamEntry.rating) }}
        </span>
      </li>
    </ol>

    <ol v-else class="flex flex-col">
      <li
        v-for="entry in topPlayers"
        :key="`${entry.name}-${entry.teamName}`"
        class="flex items-center gap-2 border-b border-default px-2 py-1.5 text-sm last:border-b-0"
        :class="entry.isUser ? 'bg-elevated font-semibold' : ''"
      >
        <span class="w-6 shrink-0 text-right text-xs text-muted tabular-nums">
          {{ entry.rank }}
        </span>
        <span class="min-w-0 flex-1 truncate">
          {{ entry.name }}
          <span v-if="entry.isUser" class="text-xs text-primary">
            · {{ t("page.game.career.rankings.you") }}
          </span>
        </span>
        <span class="min-w-0 shrink-0 truncate text-xs text-muted">{{ entry.teamName }}</span>
        <span class="w-8 shrink-0 text-right text-xs tabular-nums">
          {{ Math.round(entry.rating) }}
        </span>
      </li>
      <li
        v-if="userOutsideTop && userEntry"
        class="mt-1 flex items-center gap-2 border border-default bg-elevated px-2 py-1.5 text-sm font-semibold"
      >
        <span class="w-6 shrink-0 text-right text-xs text-muted tabular-nums">
          {{ userEntry.rank }}
        </span>
        <span class="min-w-0 flex-1 truncate">
          {{ userEntry.name }}
          <span class="text-xs text-primary">· {{ t("page.game.career.rankings.you") }}</span>
        </span>
        <span class="min-w-0 shrink-0 truncate text-xs text-muted">{{ userEntry.teamName }}</span>
        <span class="w-8 shrink-0 text-right text-xs tabular-nums">
          {{ Math.round(userEntry.rating) }}
        </span>
      </li>
    </ol>
  </div>
</template>
