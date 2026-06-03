<script lang="ts" setup>
import type { Team } from "~/types/team";

interface Props {
  team: Team;
}

const { team } = defineProps<Props>();
</script>

<template>
  <UButton
    class="flex items-center gap-3"
    variant="ghost"
    color="neutral"
    :to="$localePath(`/team/${team.slug}`)"
  >
    <div class="flex-1 min-w-0">
      <div class="flex flex-col">
        <span class="text-highlighted font-medium truncate">
          {{ team.name }}
        </span>
      </div>
    </div>
  </UButton>
</template>
