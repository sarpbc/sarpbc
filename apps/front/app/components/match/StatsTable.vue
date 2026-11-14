<script lang="ts" setup>
import { participantName, playerPath } from "@sarpbc/utils";
import type { MatchGamePlayerStats, MatchGameStats } from "@sarpbc/types";
import type { TournamentParticipant } from "~/types/tournament";

const { games, participants } = defineProps<{
  games: MatchGameStats[];
  participants: TournamentParticipant[];
}>();

const { t } = useI18n();

const COLUMNS = ["goals", "assists", "saves", "shots", "demolitions"] as const;

const selected = ref(String(games[0]?.number ?? 1));

watch(
  () => games,
  (current) => (selected.value = String(current[0]?.number ?? 1)),
);

const game = computed(
  () => games.find((candidate) => String(candidate.number) === selected.value) ?? games[0],
);

const tabs = computed(() =>
  games.map((candidate) => ({
    label: t("page.match.detail.stats.game", { number: candidate.number }),
    value: String(candidate.number),
  })),
);

function playerLabel(row: MatchGamePlayerStats): string {
  return row.player?.name ?? row.name;
}

const teams = computed(() => {
  const current = game.value;

  if (!current) return [];
  const order = participants.map((participant) => participant.id);

  return [...current.teams]
    .toSorted((a, b) => order.indexOf(a.participantId) - order.indexOf(b.participantId))
    .map((team) => {
      const participant = participants.find((entry) => entry.id === team.participantId);

      return {
        ...team,
        name: (participant && participantName(participant)) || t("page.match.detail.unknownTeam"),
        players: team.players.toSorted(
          (a, b) => b.goals - a.goals || playerLabel(a).localeCompare(playerLabel(b)),
        ),
      };
    });
});

const replayUrl = computed(() => `https://ballchasing.com/replay/${game.value?.ballchasingId}`);

const replayLabel = computed(() =>
  t("page.match.detail.stats.replayLink", { number: game.value?.number ?? 1 }),
);
</script>

<template>
  <SCard v-if="game" class="flex flex-col">
    <div v-if="games.length > 1" class="flex h-row items-center justify-center px-2">
      <STabs v-model="selected" :items="tabs" :ariaLabel="t('page.match.detail.stats.games')" />
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <caption class="sr-only">
          {{
            t("page.match.detail.stats.caption", { number: game.number })
          }}
        </caption>
        <thead>
          <tr class="h-row border-b border-separator text-xs text-muted">
            <th scope="col" class="px-2 text-left font-normal">
              {{ t("page.match.detail.stats.player") }}
            </th>
            <th
              v-for="column in COLUMNS"
              :key="column"
              scope="col"
              class="w-10 px-1 text-right font-normal"
            >
              <abbr
                :title="t(`page.match.detail.stats.columns.${column}.label`)"
                class="no-underline"
              >
                {{ t(`page.match.detail.stats.columns.${column}.short`) }}
              </abbr>
            </th>
          </tr>
        </thead>
        <tbody v-for="team in teams" :key="team.participantId">
          <tr class="h-row border-b border-separator bg-elevated/50">
            <th scope="rowgroup" colspan="6" class="px-2 text-left text-xs font-normal">
              <span class="sr-only">
                {{
                  t(
                    "page.match.detail.stats.teamScore",
                    { team: team.name, goals: team.goals },
                    team.goals,
                  )
                }}
              </span>
              <span aria-hidden="true" class="flex items-center justify-between gap-2">
                <span class="truncate text-highlighted">{{ team.name }}</span>
                <span class="tabular-nums text-highlighted">{{ team.goals }}</span>
              </span>
            </th>
          </tr>
          <tr
            v-for="(row, index) in team.players"
            :key="index"
            class="h-row border-b border-separator"
          >
            <th scope="row" class="max-w-0 px-2 text-left font-normal">
              <SLink
                v-if="row.player"
                :to="$localePath(playerPath(row.player.slug))"
                variant="inline"
                class="block truncate"
              >
                {{ playerLabel(row) }}
              </SLink>
              <span v-else class="block truncate text-muted">{{ playerLabel(row) }}</span>
            </th>
            <td v-for="column in COLUMNS" :key="column" class="px-1 text-right tabular-nums">
              {{ row[column] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="flex h-row items-center px-2 text-xs text-muted">
      <SLink
        :to="replayUrl"
        external
        target="_blank"
        rel="noopener noreferrer"
        variant="muted"
        :aria-label="replayLabel"
      >
        {{ t("page.match.detail.stats.source") }}
      </SLink>
    </p>
  </SCard>
</template>
