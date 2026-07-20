<script lang="ts" setup>
import type { Team } from "~/types/team";
import { selectActiveRosterPlayers } from "~/utils/teamRoster";

const props = defineProps<{
  team: Team;
}>();

const activePlayerCount = computed(
  () => selectActiveRosterPlayers(props.team.players ?? []).length,
);
</script>

<template>
  <UButton
    :key="team.id"
    :to="$localePath(`/team/${team.slug}`)"
    variant="ghost"
    color="neutral"
    as="link"
  >
    <div class="size-10 flex items-center justify-center overflow-hidden shrink-0">
      <img
        v-if="team.imageUrl"
        :src="team.imageUrl"
        :alt="team.name"
        class="max-w-full max-h-full object-contain"
      />
      <UIcon v-else name="i-fluent-shield-question-24-regular" class="text-2xl text-muted" />
    </div>
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
  </UButton>
</template>
