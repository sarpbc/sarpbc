<script lang="ts" setup>
import type { Player } from "~/types/player";

interface Props {
  players: Player[];
  title?: string;
}

defineProps<Props>();
</script>

<template>
  <div v-if="players.length > 0" class="flex flex-col">
    <h4 v-if="title" class="text-muted text-sm mb-2">
      {{ title }}
    </h4>
    <div class="flex flex-col gap-1">
      <PlayerRow v-for="player in players" :key="player.id" :player="player" />
    </div>
  </div>
</template>
