<script lang="ts" setup>
import type { Team } from "~/types/team";

interface Props {
  teams: Team[];
  title?: string;
}

defineProps<Props>();
</script>

<template>
  <div v-if="teams.length > 0" class="flex flex-col">
    <h4 v-if="title" class="text-muted text-sm mb-2">
      {{ title }}
    </h4>
    <div class="flex flex-col gap-1">
      <TeamRow v-for="team in teams" :key="team.id" :team="team" />
    </div>
  </div>
</template>
