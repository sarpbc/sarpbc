<script lang="ts" setup>
import { playerPath, teamPath } from "@sarpbc/utils";
import type { TournamentParticipantEntry } from "~/utils/tournamentParticipants";

const { entry } = defineProps<{
  entry: TournamentParticipantEntry;
}>();

const { t } = useI18n();

const open = ref(false);
const dialogId = computed(() => `tournament-roster-${entry.id}`);
const titleId = computed(() => `tournament-roster-title-${entry.id}`);

const soloPlayer = computed(() =>
  !entry.team && entry.players.length === 1 ? entry.players[0] : undefined,
);
</script>

<template>
  <SLink
    v-if="soloPlayer"
    :to="$localePath(playerPath(soloPlayer.slug))"
    variant="muted"
    class="flex w-full items-center gap-2 px-2 h-row min-h-row border-r border-b border-separator interactive-surface"
  >
    <TeamImg :team-name="entry.name" size="sm" />
    <span class="text-sm font-medium truncate">{{ entry.name }}</span>
  </SLink>

  <UPopover
    v-else
    v-model:open="open"
    mode="hover"
    enable-touch
    :open-delay="80"
    :close-delay="100"
  >
    <button
      type="button"
      class="flex w-full items-center gap-2 px-2 h-row min-h-row border-r border-b border-separator interactive-surface"
      :aria-label="t('page.tournaments.id.participants.openRoster', { team: entry.name })"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-controls="dialogId"
    >
      <TeamImg :team-name="entry.name" :logo="entry.team" size="sm" />
      <span class="text-sm font-medium truncate">{{ entry.name }}</span>
    </button>

    <template #content>
      <div
        :id="dialogId"
        class="min-w-56 max-w-72 p-2 flex flex-col gap-2"
        role="dialog"
        :aria-labelledby="titleId"
      >
        <SLink
          v-if="entry.team"
          :id="titleId"
          :to="$localePath(teamPath(entry.team.slug))"
          variant="muted"
          class="flex items-center gap-2 text-sm font-medium"
          :aria-label="t('page.tournaments.id.participants.viewTeam', { team: entry.name })"
        >
          <TeamImg :team-name="entry.name" :logo="entry.team" size="xs" />
          <span class="truncate">{{ entry.name }}</span>
        </SLink>
        <p v-else :id="titleId" class="truncate text-sm font-medium">{{ entry.name }}</p>

        <div v-if="entry.players.length" class="flex flex-col gap-1">
          <SLink
            v-for="player in entry.players"
            :key="player.id"
            :to="$localePath(playerPath(player.slug))"
            variant="muted"
            class="flex min-h-row-compact items-center gap-2 px-1 text-sm"
          >
            <FlagIcon :nationality="player.nationality" size="sm" />
            <span class="truncate">{{ player.name }}</span>
          </SLink>
        </div>
        <p v-else class="text-sm text-muted">
          {{ t("page.tournaments.id.participants.rosterEmpty") }}
        </p>
      </div>
    </template>
  </UPopover>
</template>
