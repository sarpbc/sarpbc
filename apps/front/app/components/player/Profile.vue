<script lang="ts" setup>
import type { Player } from "~/types/player";

interface Props {
  player: Player;
  size?: "sm" | "md" | "lg" | "xl";
}

const { player, size = "md" } = defineProps<Props>();

const { attrs: cuelumeAttrs } = useCuelume();
</script>

<template>
  <ULink
    :to="$localePath(`/player/${player.slug}`)"
    class="flex w-fit flex-col items-center gap-1.5 rounded-md p-2 touch-manipulation hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.96]"
    v-bind="cuelumeAttrs.hoverTick"
  >
    <PlayerImg :player-name="player.name" :img="player.imageUrl" :size="size" />
    <div class="flex w-full min-w-0 flex-row items-center justify-center gap-1">
      <FlagIcon :nationality="player.nationality" class="shrink-0" />
      <span class="truncate text-center text-sm">{{ player.name }}</span>
    </div>
  </ULink>
</template>
