<script lang="ts" setup>
import type { Player } from "~/types/player";

interface Props {
  player: Player;
}

const { player } = defineProps<Props>();
</script>

<template>
  <UiButton
    class="flex items-center gap-2"
    variant="ghost"
    color="neutral"
    :to="$localePath(`/player/${player.slug}`)"
  >
    <FlagIcon :nationality="player.nationality" size="sm" />

    <div class="flex-1 min-w-0">
      <div class="flex flex-col">
        <span class="text-highlighted font-medium truncate">
          {{ player.name }}
        </span>
      </div>
    </div>
  </UiButton>
</template>
