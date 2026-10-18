<script lang="ts" setup>
import type { Team } from "~/types/team";
import { selectActiveRosterPlayers } from "@sarpbc/utils";

const { team } = defineProps<{
  team: Team;
}>();

const activePlayerCount = computed(() => selectActiveRosterPlayers(team.players ?? []).length);
</script>

<template>
  <SListItem divider :to="$localePath(`/team/${team.slug}`)" class="min-w-0 gap-3">
    <TeamImg
      :team-name="team.name"
      :image-url="team.imageUrl"
      :dark-mode-image-url="team.darkModeImageUrl"
      size="list"
    />
    <h2 class="min-w-0 flex-1 truncate text-sm font-medium text-default">
      {{ team.name }}
    </h2>
    <span class="hidden w-40 shrink-0 truncate text-xs text-muted sm:block">
      {{ team.location }}
    </span>
    <span class="w-20 shrink-0 truncate text-end text-xs text-muted tabular-nums">
      <template v-if="activePlayerCount > 0">
        {{ $t("page.teams.index.activePlayers", { count: activePlayerCount }) }}
      </template>
    </span>
  </SListItem>
</template>
