<script lang="ts" setup>
import type { TournamentParticipant } from "~/types/tournament";

const { participants } = defineProps<{
  participants: TournamentParticipant[];
}>();

const { t } = useI18n();

// Both columns render the same number of rows so every divider lines up across the table.
const rowCount = computed(() =>
  Math.max(1, ...participants.map((participant) => participant.players?.length ?? 0)),
);
</script>

<template>
  <SCard flush-top flush-bottom class="grid grid-cols-2">
    <div
      v-for="(participant, columnIndex) in participants"
      :key="participant.id"
      class="flex min-w-0 flex-col"
      :class="columnIndex === 0 ? 'border-r border-default' : undefined"
    >
      <SListItem size="default" divider class="min-w-0 gap-2">
        <TeamImg
          :team-name="participant.team.name"
          :image-url="participant.team.imageUrl"
          :dark-mode-image-url="participant.team.darkModeImageUrl"
          size="xs"
        />
        <h3 class="truncate text-xs font-medium text-toned">{{ participant.team.name }}</h3>
      </SListItem>
      <template v-for="rowIndex in rowCount" :key="rowIndex">
        <SListItem
          v-if="participant.players?.[rowIndex - 1]"
          size="double"
          divider
          :to="$localePath(`/player/${participant.players[rowIndex - 1]!.slug}`)"
          class="min-w-0 gap-3"
        >
          <PlayerImg
            :player-name="participant.players[rowIndex - 1]!.name"
            :img="participant.players[rowIndex - 1]!.imageUrl"
            size="row"
          />
          <div class="flex min-w-0 items-center gap-2">
            <FlagIcon
              :nationality="participant.players[rowIndex - 1]!.nationality"
              class="shrink-0"
            />
            <span class="truncate text-sm">{{ participant.players[rowIndex - 1]!.name }}</span>
          </div>
        </SListItem>
        <SListItem v-else size="double" divider class="min-w-0">
          <span v-if="rowIndex === 1" class="self-center truncate text-sm text-muted">
            {{ t("page.match.detail.noRoster") }}
          </span>
        </SListItem>
      </template>
    </div>
  </SCard>
</template>
