<script lang="ts" setup>
import type { Team } from "~/types/team";
import { selectActiveRosterPlayers } from "@sarpbc/utils";

const props = defineProps<{
  team: Team;
}>();

const activePlayerCount = computed(
  () => selectActiveRosterPlayers(props.team.players ?? []).length,
);
</script>

<template>
  <SButton
    :key="team.id"
    :to="$localePath(`/team/${team.slug}`)"
    variant="ghost"
    color="neutral"
    as="link"
  >
    <TeamImg
      :team-name="team.name"
      :image-url="team.imageUrl"
      :dark-mode-image-url="team.darkModeImageUrl"
      size="sm"
    />
    <div class="flex-1 min-w-0">
      <div class="font-medium truncate">{{ team.name }}</div>
      <div v-if="team.location" class="text-sm text-muted truncate">
        {{ team.location }}
      </div>
    </div>
    <div v-if="activePlayerCount > 0" class="text-xs text-muted">
      {{ activePlayerCount }}
      {{
        activePlayerCount === 1 ? $t("page.players.index.player") : $t("page.players.index.players")
      }}
    </div>
  </SButton>
</template>
