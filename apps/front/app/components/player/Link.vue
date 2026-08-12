<script lang="ts" setup>
import type { Player } from "~/types/player";

defineProps<{
  player: Player;
}>();
</script>

<template>
  <SButton
    :key="player.id"
    :to="$localePath(`/player/${player.slug}`)"
    variant="ghost"
    color="neutral"
    as="link"
  >
    <div
      class="size-10 flex items-center justify-center overflow-hidden shrink-0 rounded-full bg-muted"
    >
      <img
        v-if="player.imageUrl"
        :src="player.imageUrl"
        :alt="player.name"
        class="h-full w-full object-cover"
      />
      <UIcon v-else name="i-fluent-shield-question-24-regular" class="text-2xl text-muted" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="font-medium truncate">{{ player.name }}</div>
      <div v-if="player.team" class="text-sm text-muted truncate">
        {{ player.team.name }}
      </div>
    </div>
    <FlagIcon v-if="player.nationality" :code="player.nationality" class="w-6 h-4 shrink-0" />
  </SButton>
</template>
