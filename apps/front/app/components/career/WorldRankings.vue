<script lang="ts" setup>
import type { RankedPlayer, RankedTeam } from "~/utils/career/simulation";

type RankingKind = "teams" | "players";

type PlayerListItem = { type: "player"; entry: RankedPlayer } | { type: "divider" };

const props = defineProps<{
  kind: RankingKind;
  teams?: RankedTeam[];
  players?: RankedPlayer[];
  hoveredTeamId: string | null;
}>();

const emit = defineEmits<{
  "update:hoveredTeamId": [teamId: string | null];
}>();

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

function setHoveredTeam(teamId: string | null): void {
  emit("update:hoveredTeamId", teamId);
}

function onRowLeave(event: MouseEvent, teamId: string): void {
  const current = event.currentTarget as HTMLElement;
  const next = event.relatedTarget as Node | null;
  if (next && current.contains(next)) {
    return;
  }
  if (props.hoveredTeamId === teamId) {
    emit("update:hoveredTeamId", null);
  }
}

const highlightedRosterExtras = computed(() => {
  const teamId = props.hoveredTeamId;
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

const playerFooterItems = computed((): PlayerListItem[] => {
  const items: PlayerListItem[] = [];
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
const playerTeamFooter = computed(() => {
  if (!playerTeamEntry.value || playerTeamEntry.value.rank <= topTeams.value.length) {
    return null;
  }
  return playerTeamEntry.value;
});

const extraTeams = computed((): RankedTeam[] => {
  const extras: RankedTeam[] = [];
  const seen = new Set(topTeams.value.map((entry) => entry.team.id));

  const add = (entry: RankedTeam | undefined): void => {
    if (!entry || seen.has(entry.team.id)) {
      return;
    }
    seen.add(entry.team.id);
    extras.push(entry);
  };

  add(playerTeamFooter.value ?? undefined);

  const hoveredId = props.hoveredTeamId;
  if (hoveredId) {
    add((props.teams ?? []).find((entry) => entry.team.id === hoveredId));
  }

  return extras;
});

const teamSections = computed(() => {
  const sections: RankedTeam[][] = [topTeams.value];
  if (extraTeams.value.length > 0) {
    sections.push(extraTeams.value);
  }
  return sections;
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
  const highlighted = props.hoveredTeamId === entry.team.id;
  return [
    rankingGridClass,
    "h-row-compact min-h-row-compact border-b border-default border-l-2 text-left text-sm",
    "hover:border-l-primary hover:bg-elevated",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
    highlighted ? "border-l-primary bg-elevated" : "border-l-transparent",
    entry.isPlayerTeam ? "bg-elevated font-semibold" : "",
  ];
}

function playerRowClass(entry: RankedPlayer): string[] {
  const highlighted = props.hoveredTeamId === entry.teamId;
  return [
    rankingGridClass,
    "h-row-compact min-h-row-compact border-b border-default border-l-2 text-sm",
    "hover:border-l-primary hover:bg-elevated",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
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
  if (props.hoveredTeamId === teamId) {
    emit("update:hoveredTeamId", null);
  }
}
</script>

<template>
  <SRail caption="lead" :title="title">
    <SCard flush-bottom>
      <template v-if="kind === 'teams'">
        <ol
          v-for="(section, index) in teamSections"
          :key="index"
          class="flex flex-col"
          :class="index > 0 ? 'border-t border-default' : ''"
        >
          <li
            v-for="entry in section"
            :key="entry.team.id"
            tabindex="0"
            :class="[
              teamRowClass(entry),
              index === 0 && extraTeams.length ? 'last:border-b-0' : '',
            ]"
            @mouseenter="setHoveredTeam(entry.team.id)"
            @mouseleave="onRowLeave($event, entry.team.id)"
            @focusin="setHoveredTeam(entry.team.id)"
            @focusout="onTeamFocusOut($event, entry.team.id)"
          >
            <UTooltip
              :text="t('page.game.career.rankings.teamWorldRanking')"
              :content="tooltipContent"
            >
              <span class="block text-right text-xs text-muted tabular-nums">
                {{ entry.rank }}
              </span>
            </UTooltip>
            <span class="min-w-0 truncate" :class="entry.isPlayerTeam ? 'text-primary' : ''">
              {{ entry.team.name }}
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
          </li>
        </ol>
      </template>

      <template v-else>
        <ol class="flex flex-col">
          <li
            v-for="entry in topPlayers"
            :key="playerKey(entry)"
            tabindex="0"
            :class="[playerRowClass(entry), playerFooterItems.length ? 'last:border-b-0' : '']"
            @mouseenter="setHoveredTeam(entry.teamId)"
            @mouseleave="onRowLeave($event, entry.teamId)"
            @focusin="setHoveredTeam(entry.teamId)"
            @focusout="onTeamFocusOut($event, entry.teamId)"
          >
            <span class="block text-right text-xs text-muted tabular-nums">
              {{ entry.rank }}
            </span>
            <span class="min-w-0 truncate" :class="entry.isUser ? 'text-primary' : ''">
              {{ entry.name }}
            </span>
            <span class="block min-w-0 truncate text-muted">{{ entry.teamName }}</span>
            <UTooltip :text="t('page.game.career.rankings.playerRating')" :content="tooltipContent">
              <span class="block text-right text-xs tabular-nums">
                {{ Math.round(entry.rating) }}
              </span>
            </UTooltip>
          </li>
        </ol>
        <ol v-if="playerFooterItems.length" class="flex flex-col border-t border-default">
          <template v-for="item in playerFooterItems" :key="playerListKey(item)">
            <li
              v-if="item.type === 'divider'"
              class="flex h-row-compact min-h-row-compact items-center border-b border-default px-2 text-xs text-muted"
            >
              {{ t("page.game.career.rankings.alsoOnRoster") }}
            </li>
            <li
              v-else
              tabindex="0"
              :class="playerRowClass(item.entry)"
              @mouseenter="setHoveredTeam(item.entry.teamId)"
              @mouseleave="onRowLeave($event, item.entry.teamId)"
              @focusin="setHoveredTeam(item.entry.teamId)"
              @focusout="onTeamFocusOut($event, item.entry.teamId)"
            >
              <span class="block text-right text-xs text-muted tabular-nums">
                {{ item.entry.rank }}
              </span>
              <span class="min-w-0 truncate" :class="item.entry.isUser ? 'text-primary' : ''">
                {{ item.entry.name }}
              </span>
              <span class="block min-w-0 truncate text-muted">{{ item.entry.teamName }}</span>
              <UTooltip
                :text="t('page.game.career.rankings.playerRating')"
                :content="tooltipContent"
              >
                <span class="block text-right text-xs tabular-nums">
                  {{ Math.round(item.entry.rating) }}
                </span>
              </UTooltip>
            </li>
          </template>
        </ol>
      </template>
    </SCard>
  </SRail>
</template>
