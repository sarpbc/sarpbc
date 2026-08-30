<script lang="ts" setup>
import type { BracketSectionLayout } from "~/utils/tournamentBracket";
import { resolveMatchDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";
import {
  BRACKET_COLUMN_GAP,
  BRACKET_MATCH_HEIGHT,
  BRACKET_MATCH_WIDTH,
  BRACKET_ROW_STEP,
  bracketMatchCenterY,
  bracketMatchLeft,
  bracketMatchTop,
  bracketTeamRowCenterY,
} from "~/utils/tournamentBracket";

const { layout } = defineProps<{
  layout: BracketSectionLayout;
}>();

const containerHeight = computed(() => layout.rowCount * BRACKET_ROW_STEP + BRACKET_MATCH_HEIGHT);

const containerWidth = computed(
  () => layout.columnCount * BRACKET_MATCH_WIDTH + (layout.columnCount - 1) * BRACKET_COLUMN_GAP,
);

function matchTop(row: number): number {
  return bracketMatchTop(row);
}

const connectorPaths = computed(() => {
  const matchMap = new Map(layout.matches.map((match) => [match.matchId, match]));

  return layout.connectors
    .map((connector) => {
      const from = matchMap.get(connector.fromMatchId);
      const to = matchMap.get(connector.toMatchId);
      if (!from || !to) {
        return null;
      }

      // Upper and lower zones are stacked vertically; skip cross-zone connector lines.
      if (from.zone && to.zone && from.zone !== to.zone) {
        return null;
      }

      const fromX = bracketMatchLeft(from.column) + BRACKET_MATCH_WIDTH;
      const fromY = bracketMatchCenterY(from.row);

      const toX = bracketMatchLeft(to.column);
      const toY = bracketTeamRowCenterY(to.row, connector.targetSlot);

      const midX = fromX + BRACKET_COLUMN_GAP / 2;

      return {
        d: `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`,
        linkType: connector.linkType,
      };
    })
    .filter((path): path is NonNullable<typeof path> => path !== null);
});

function bracketMatchStatus(match: (typeof layout.matches)[number]) {
  return resolveMatchDiscoveryStatus({
    endAt: match.endAt,
    beginAt: match.beginAt,
    status: match.status,
  });
}
</script>

<template>
  <div class="w-full overflow-x-auto">
    <div
      class="relative"
      :style="{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
        minHeight: `${containerHeight}px`,
      }"
    >
      <svg
        class="pointer-events-none absolute inset-0"
        :width="containerWidth"
        :height="containerHeight"
        aria-hidden="true"
      >
        <path
          v-for="(path, index) in connectorPaths"
          :key="index"
          :d="path.d"
          fill="none"
          :class="path.linkType === 'loser' ? 'stroke-muted/50' : 'stroke-default'"
          stroke-width="1.5"
        />
      </svg>

      <div
        v-for="match in layout.matches"
        :key="match.matchId"
        class="absolute"
        :style="{
          left: `${bracketMatchLeft(match.column)}px`,
          top: `${matchTop(match.row)}px`,
          width: `${BRACKET_MATCH_WIDTH}px`,
        }"
      >
        <TournamentMatchScoreLink
          bracket
          compact
          :match-id="match.matchId"
          :name="match.name"
          :team-a-name="match.teamA?.name"
          :team-b-name="match.teamB?.name"
          :team-a-image-url="match.teamA?.imageUrl"
          :team-b-image-url="match.teamB?.imageUrl"
          :team-a-dark-mode-image-url="match.teamA?.darkModeImageUrl"
          :team-b-dark-mode-image-url="match.teamB?.darkModeImageUrl"
          :participant-a-id="match.participantAId"
          :participant-b-id="match.participantBId"
          :results="match.results"
          :winner-participant-id="match.winnerParticipantId"
          :match-status="bracketMatchStatus(match)"
          discovery-source="tournament_hub"
          :discovery-status="bracketMatchStatus(match)"
        />
      </div>
    </div>
  </div>
</template>
