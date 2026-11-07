<script lang="ts" setup>
import type { Player } from "@sarpbc/types";
import { playerPath } from "@sarpbc/utils";

interface Props {
  player: Player;
}

const { player } = defineProps<Props>();
</script>

<template>
  <UButton
    class="flex items-center gap-2"
    variant="ghost"
    color="neutral"
    :to="$localePath(playerPath(player.slug))"
  >
    <FlagIcon :nationality="player.nationality" size="sm" />

    <div class="flex-1 min-w-0">
      <div class="flex flex-col">
        <span class="text-highlighted font-medium truncate">
          {{ player.name }}
        </span>
      </div>
    </div>
  </UButton>
</template>
