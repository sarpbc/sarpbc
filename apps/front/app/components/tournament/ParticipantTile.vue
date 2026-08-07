<script lang="ts" setup>
import type { Player } from "~/types/player";
import type { Team } from "~/types/team";

const { team, players } = defineProps<{
  team: Team;
  players: Player[];
}>();

const { t } = useI18n();

const open = ref(false);
const dialogId = computed(() => `tournament-roster-${team.id}`);
const titleId = computed(() => `tournament-roster-title-${team.id}`);
</script>

<template>
  <UPopover v-model:open="open">
    <button
      type="button"
      class="flex w-full items-center gap-2 px-2 h-row min-h-row border border-default hover:bg-elevated/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      :aria-label="t('page.tournaments.id.participants.openRoster', { team: team.name })"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-controls="dialogId"
    >
      <TeamImg :team-name="team.name" :image-url="team.imageUrl" size="sm" />
      <span class="text-sm font-medium truncate">{{ team.name }}</span>
    </button>

    <template #content>
      <div
        :id="dialogId"
        class="min-w-56 max-w-72 p-2 flex flex-col gap-2"
        role="dialog"
        :aria-labelledby="titleId"
      >
        <ULink
          :id="titleId"
          :to="$localePath(`/team/${team.slug}`)"
          class="text-sm font-semibold tracking-tight text-highlighted hover:underline"
          :aria-label="t('page.tournaments.id.participants.viewTeam', { team: team.name })"
        >
          {{ team.name }}
        </ULink>

        <div v-if="players.length" class="flex flex-col">
          <UiListItem
            v-for="player in players"
            :key="player.id"
            size="compact"
            divider
            :to="$localePath(`/player/${player.slug}`)"
            class="gap-2"
          >
            <FlagIcon :nationality="player.nationality" size="sm" />
            <span class="text-sm font-medium truncate">{{ player.name }}</span>
          </UiListItem>
        </div>
        <p v-else class="text-sm text-muted">
          {{ t("page.tournaments.id.participants.rosterEmpty") }}
        </p>
      </div>
    </template>
  </UPopover>
</template>
