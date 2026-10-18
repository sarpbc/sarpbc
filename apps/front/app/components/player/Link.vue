<script lang="ts" setup>
import type { Player } from "~/types/player";

defineProps<{
  player: Player;
}>();
</script>

<template>
  <SListItem divider :to="$localePath(`/player/${player.slug}`)" class="min-w-0 gap-3">
    <PlayerImg :player-name="player.name" :img="player.imageUrl" size="list" />
    <h2 class="min-w-0 flex-1 truncate text-sm font-medium text-default">
      {{ player.name }}
    </h2>
    <span class="w-28 shrink-0 truncate text-xs text-muted sm:w-40">
      {{ player.team?.name }}
    </span>
    <span class="flex w-4 shrink-0 justify-end">
      <FlagIcon v-if="player.nationality" :nationality="player.nationality" size="md" />
    </span>
  </SListItem>
</template>
