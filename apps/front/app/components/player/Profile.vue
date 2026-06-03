<script lang="ts" setup>
import type { Player } from "~/types/player";

interface Props {
  player: Player;
  size?: "sm" | "md" | "lg" | "xl";
}

const { player, size = "md" } = defineProps<Props>();
</script>

<template>
  <ULink
    :to="$localePath(`/player/${player.slug}`)"
    class="flex flex-col gap-1 hover:cursor-pointer"
  >
    <PlayerImg :player-name="player.name" :img="player.imageUrl" :size="size" />
    <div class="w-full flex flex-row justify-center items-center gap-1">
      <FlagIcon :nationality="player.nationality" />
      <span class="text-center">{{ player.name }}</span>
    </div>
  </ULink>
</template>
