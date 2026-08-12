<script lang="ts" setup>
import type { RankedPlayer, RankedTeam } from "~/utils/career/simulation";

type RankingKind = "teams" | "players";

type PlayerListItem = { type: "player"; entry: RankedPlayer } | { type: "divider" };

const props = defineProps<{
  kind: RankingKind;
  teams?: RankedTeam[];
  players?: RankedPlayer[];
  highlightTeamId?: string | null;
}>();

const hoveredTeamId = defineModel<string | null>("hoveredTeamId", { default: null });

const { t } = useI18n();

const topTeams = computed(() => (props.teams ?? []).slice(0, 16));
const topPlayers = computed(() => (props.players ?? []).slice(0, 20));

function playerKey(player: RankedPlayer): string {
  return `${player.name}-${player.teamName}`;
}

function playerListKey(item: PlayerListItem): string {
  switch (item.type) {
    case "divider":
      return "roster-divider";
    case "player":
      return playerKey(item.entry);
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

const topPlayerKeys = computed(() => {
  const keys = new Set<string>();
  for (const player of topPlayers.value) {
    keys.add(playerKey(player));
  }
  return keys;
});

const highlightedRosterExtras = computed(() => {
  const teamId = props.highlightTeamId;
  if (!teamId) {
    return [];
  }
  return (props.players ?? [])
    .filter((player) => player.teamId === teamId && !topPlayerKeys.value.has(playerKey(player)))
    .sort((a, b) => a.rank - b.rank);
});

const userEntry = computed(() => props.players?.find((player) => player.isUser) ?? null);

const userExtra = computed(() => {
  const user = userEntry.value;
  if (!user) {
    return null;
  }
  const key = playerKey(user);
  if (topPlayerKeys.value.has(key)) {
    return null;
  }
  if (highlightedRosterExtras.value.some((player) => playerKey(player) === key)) {
    return null;
  }
  return user;
});

const playerListItems = computed((): PlayerListItem[] => {
  const items: PlayerListItem[] = topPlayers.value.map((entry) => ({ type: "player", entry }));
  if (highlightedRosterExtras.value.length > 0) {
    items.push({ type: "divider" });
    for (const entry of highlightedRosterExtras.value) {
      items.push({ type: "player", entry });
    }
  }
  if (userExtra.value) {
    items.push({ type: "player", entry: userExtra.value });
  }
  return items;
});

const playerTeamEntry = computed(() => props.teams?.find((team) => team.isPlayerTeam) ?? null);
const playerTeamOutsideTop = computed(
  () => playerTeamEntry.value !== null && playerTeamEntry.value.rank > topTeams.value.length,
);

const displayedTeams = computed(() => {
  if (playerTeamOutsideTop.value && playerTeamEntry.value) {
    return [...topTeams.value, playerTeamEntry.value];
  }
  return topTeams.value;
});

const rankingGridClass =
  "grid w-full grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-2 px-2";

const tooltipContent = {
  align: "center" as const,
  side: "top" as const,
  sideOffset: 4,
};

const title = computed(() => {
  switch (props.kind) {
    case "teams":
      return t("page.game.career.rankings.bestTeams");
    case "players":
      return t("page.game.career.rankings.bestPlayers");
    default: {
      const _exhaustive: never = props.kind;
      return _exhaustive;
    }
  }
});

function teamRowClass(entry: RankedTeam): string[] {
  const highlighted = hoveredTeamId.value === entry.team.id;
  return [
    rankingGridClass,
    "border-l-2 py-1.5 text-left text-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
    highlighted ? "border-l-primary bg-elevated" : "border-l-transparent",
    entry.isPlayerTeam ? "bg-elevated font-semibold" : "",
  ];
}

function playerRowClass(entry: RankedPlayer): string[] {
  const highlighted = props.highlightTeamId === entry.teamId;
  return [
    rankingGridClass,
    "border-b border-default border-l-2 py-1.5 text-sm last:border-b-0",
    highlighted ? "border-l-primary bg-elevated" : "border-l-transparent",
    entry.isUser ? "bg-elevated font-semibold" : "",
  ];
}

function onTeamFocusOut(event: FocusEvent, teamId: string): void {
  const current = event.currentTarget as HTMLElement;
  const next = event.relatedTarget as Node | null;
  if (next && current.contains(next)) {
    return;
  }
  if (hoveredTeamId.value === teamId) {
    hoveredTeamId.value = null;
  }
}
</script>

<template>
  <SRail caption="lead" :title="title">
    <SCard flush-bottom>
      <ol v-if="kind === 'teams'" class="flex flex-col">
        <li
          v-for="entry in displayedTeams"
          :key="entry.team.id"
          class="border-b border-default last:border-b-0"
        >
          <div
            tabindex="0"
            :class="teamRowClass(entry)"
            @mouseenter="hoveredTeamId = entry.team.id"
            @mouseleave="hoveredTeamId = null"
            @focusin="hoveredTeamId = entry.team.id"
            @focusout="onTeamFocusOut($event, entry.team.id)"
          >
            <span class="block text-right text-xs text-muted tabular-nums">
              {{ entry.rank }}
            </span>
            <span class="flex min-w-0 items-center gap-1">
              <span class="min-w-0 truncate">{{ entry.team.name }}</span>
              <span v-if="entry.isPlayerTeam" class="shrink-0 text-xs text-primary">
                · {{ t("page.game.career.rankings.yourTeam") }}
              </span>
            </span>
            <span class="block min-w-0 truncate text-muted">
              {{ t(`page.game.career.onboarding.regions.${entry.team.region}`) }}
            </span>
            <UTooltip
              :text="t('page.game.career.rankings.circuitPoints')"
              :content="tooltipContent"
            >
              <span class="block text-right text-xs tabular-nums">
                {{ Math.round(entry.points) }}
              </span>
            </UTooltip>
          </div>
        </li>
      </ol>

      <ol v-else class="flex flex-col">
        <template v-for="item in playerListItems" :key="playerListKey(item)">
          <li
            v-if="item.type === 'divider'"
            class="border-b border-default px-2 py-1.5 text-xs text-muted"
          >
            {{ t("page.game.career.rankings.alsoOnRoster") }}
          </li>
          <li v-else :class="playerRowClass(item.entry)">
            <span class="block text-right text-xs text-muted tabular-nums">
              {{ item.entry.rank }}
            </span>
            <span class="flex min-w-0 items-center gap-1">
              <span class="min-w-0 truncate">{{ item.entry.name }}</span>
              <span v-if="item.entry.isUser" class="shrink-0 text-xs text-primary">
                · {{ t("page.game.career.rankings.you") }}
              </span>
            </span>
            <span class="block min-w-0 truncate text-muted">{{ item.entry.teamName }}</span>
            <UTooltip :text="t('page.game.career.rankings.playerRating')" :content="tooltipContent">
              <span class="block text-right text-xs tabular-nums">
                {{ Math.round(item.entry.rating) }}
              </span>
            </UTooltip>
          </li>
        </template>
      </ol>
    </SCard>
  </SRail>
</template>
