<script lang="ts" setup>
import { participantLogo, participantName } from "@sarpbc/utils";
import type { BracketSectionLayout } from "~/utils/bracket/types";
import { resolveMatchDiscoveryStatus } from "~/utils/match-discovery-analytics";
import {
  BRACKET_COLUMN_GAP,
  BRACKET_MATCH_HEIGHT,
  BRACKET_MATCH_WIDTH,
  BRACKET_ROW_STEP,
  bracketMatchCenterY,
  bracketMatchLeft,
  bracketMatchTop,
  bracketTeamRowCenterY,
} from "~/utils/bracket/geometry";

const { layout, tournamentId } = defineProps<{
  layout: BracketSectionLayout;
  tournamentId: string;
}>();

const containerHeight = computed(() => layout.rowCount * BRACKET_ROW_STEP + BRACKET_MATCH_HEIGHT);

const containerWidth = computed(
  () => layout.columnCount * BRACKET_MATCH_WIDTH + (layout.columnCount - 1) * BRACKET_COLUMN_GAP,
);

const matchTop = (row: number) => bracketMatchTop(row);

const connectorPaths = computed(() => {
  const matchMap = new Map(layout.matches.map((match) => [match.matchId, match]));

  return layout.connectors
    .map((connector) => {
      const from = matchMap.get(connector.fromMatchId);
      const to = matchMap.get(connector.toMatchId);

      if (!from || !to) {
        return null;
      }

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

const bracketMatchStatus = (match: (typeof layout.matches)[number]) =>
  resolveMatchDiscoveryStatus({
    beginAt: match.beginAt,
    endAt: match.endAt,
    status: match.status,
  });

const { t } = useI18n();

type LayoutMatch = BracketSectionLayout["matches"][number];

const zoneOrder = (match: LayoutMatch) => (match.zone === "lower" ? 1 : 0);

const rounds = computed(() =>
  Array.from({ length: layout.columnCount }, (_, column) => ({
    column,
    matches: layout.matches
      .filter((match) => match.column === column)
      .toSorted((a, b) => zoneOrder(a) - zoneOrder(b) || a.row - b.row),
  })).filter((round) => round.matches.length > 0),
);

const roundOptions = computed(() =>
  rounds.value.map((round, index) => ({
    label:
      index === rounds.value.length - 1 && round.matches.length === 1
        ? t("components.tournament.bracket.final")
        : t("components.tournament.bracket.round", { number: index + 1 }),
    value: String(round.column),
  })),
);

const currentRound = () => {
  const round =
    rounds.value.find((candidate) =>
      candidate.matches.some((match) => match.winnerParticipantId === null),
    ) ?? rounds.value.at(-1);

  return String(round?.column ?? 0);
};

const selectedRound = ref(currentRound());

watch(
  () => layout,
  () => {
    selectedRound.value = currentRound();
  },
);

const selectedGroups = computed(() => {
  const matches =
    rounds.value.find((round) => String(round.column) === selectedRound.value)?.matches ?? [];

  return (["upper", "lower"] as const).flatMap((zone) => {
    const zoneMatches = matches.filter(
      (match) => (match.zone === "lower" ? "lower" : "upper") === zone,
    );

    return zoneMatches.length > 0 ? [{ matches: zoneMatches, zone }] : [];
  });
});
</script>

<template>
  <div class="flex w-full flex-col gap-2 md:hidden">
    <div v-if="roundOptions.length > 1" class="overflow-x-auto">
      <STabs
        v-model="selectedRound"
        :items="roundOptions"
        :ariaLabel="t('components.tournament.bracket.rounds')"
      />
    </div>
    <section v-for="group in selectedGroups" :key="group.zone" class="flex flex-col gap-2">
      <h3 v-if="selectedGroups.length > 1" class="text-xs text-muted">
        {{ t(`components.tournament.bracket.${group.zone}`) }}
      </h3>
      <TournamentMatchScoreLink
        v-for="match in group.matches"
        :key="match.matchId"
        :match="{ id: match.matchId, publicId: match.publicId, slug: match.slug }"
        :name="match.name"
        :team-a-name="match.participantA && participantName(match.participantA)"
        :team-b-name="match.participantB && participantName(match.participantB)"
        :team-a-logo="match.participantA && participantLogo(match.participantA)"
        :team-b-logo="match.participantB && participantLogo(match.participantB)"
        :participant-a-id="match.participantAId"
        :participant-b-id="match.participantBId"
        :results="match.results"
        :winner-participant-id="match.winnerParticipantId"
        :forfeited-by="match.forfeitedBy"
        :tournament-id="tournamentId"
        :match-status="bracketMatchStatus(match)"
        discovery-source="tournament_hub"
        :discovery-status="bracketMatchStatus(match)"
      />
    </section>
  </div>
  <div class="hidden w-full overflow-x-auto md:block">
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
          :match="{ id: match.matchId, publicId: match.publicId, slug: match.slug }"
          :name="match.name"
          :team-a-name="match.participantA && participantName(match.participantA)"
          :team-b-name="match.participantB && participantName(match.participantB)"
          :team-a-logo="match.participantA && participantLogo(match.participantA)"
          :team-b-logo="match.participantB && participantLogo(match.participantB)"
          :participant-a-id="match.participantAId"
          :participant-b-id="match.participantBId"
          :results="match.results"
          :winner-participant-id="match.winnerParticipantId"
          :forfeited-by="match.forfeitedBy"
          :tournament-id="tournamentId"
          :match-status="bracketMatchStatus(match)"
          discovery-source="tournament_hub"
          :discovery-status="bracketMatchStatus(match)"
        />
      </div>
    </div>
  </div>
</template>
