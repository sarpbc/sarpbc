<script lang="ts" setup>
import type { MatchLineup, MatchLineupPlayer } from "@sarpbc/types";
import { participantName, playerPath } from "@sarpbc/utils";
import type { TournamentParticipant } from "~/types/tournament";
import { STARTGG_URL } from "~/composables/prizes";

const {
  participants,
  lineups,
  startgg = false,
} = defineProps<{
  participants: TournamentParticipant[];
  lineups: MatchLineup[];
  startgg?: boolean;
}>();

const { t } = useI18n();

const columns = computed(() =>
  participants.map((participant) => ({
    participant,
    players:
      lineups.find((lineup) => lineup.participantId === participant.id)?.players ??
      (participant.players ?? []).map((player): MatchLineupPlayer => ({
        ...player,
        standIn: false,
      })),
  })),
);

// Both columns render the same number of rows so every divider lines up across the table.
const rowCount = computed(() =>
  Math.max(1, ...columns.value.map((column) => column.players.length)),
);

const rows = computed(() =>
  columns.value.map((column) => ({
    participant: column.participant,
    cells: Array.from({ length: rowCount.value }, (_, index) => column.players[index] ?? null),
  })),
);

const hasStandIn = computed(() =>
  lineups.some((lineup) => lineup.players.some((player) => player.standIn)),
);
const showCredit = computed(() => startgg && lineups.length > 0);
</script>

<template>
  <div class="flex min-w-0 flex-col">
    <div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <SCard v-for="column in rows" :key="column.participant.id" class="flex min-w-0 flex-col">
        <SListItem size="default" class="min-w-0 gap-2">
          <TeamImg
            :team-name="participantName(column.participant)"
            :logo="column.participant.team"
            size="xs"
          />
          <h3 class="truncate text-xs text-default">{{ participantName(column.participant) }}</h3>
        </SListItem>
        <template v-for="(player, rowIndex) in column.cells" :key="rowIndex">
          <SListItem
            v-if="player"
            size="default"
            :to="$localePath(playerPath(player.slug))"
            class="min-w-0 gap-3"
          >
            <PlayerImg :player-name="player.name" :img="player.imageUrl" size="list" />
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <FlagIcon :nationality="player.nationality" class="shrink-0" />
              <span class="truncate text-sm">{{ player.name }}</span>
            </div>
            <UBadge
              v-if="player.standIn"
              color="neutral"
              variant="outline"
              size="sm"
              class="shrink-0"
            >
              {{ t("page.match.detail.lineups.standIn") }}
            </UBadge>
          </SListItem>
          <SListItem v-else size="default" class="min-w-0">
            <span v-if="rowIndex === 0" class="self-center truncate text-sm text-muted">
              {{ t("page.match.detail.noRoster") }}
            </span>
          </SListItem>
        </template>
      </SCard>
    </div>
    <p v-if="hasStandIn" class="flex h-row items-center px-2 text-xs text-muted">
      {{ t("page.match.detail.lineups.standInHint") }}
    </p>
    <p v-if="showCredit" class="flex h-row items-center px-2 text-xs text-muted">
      <span>
        {{ t("common.prizes.dataFrom") }}
        <SLink :to="STARTGG_URL" external target="_blank" variant="inline">start.gg</SLink>
      </span>
    </p>
  </div>
</template>
