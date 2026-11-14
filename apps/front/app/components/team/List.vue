<script lang="ts" setup>
import type { Team } from "@sarpbc/types";

interface Props {
  teams: Team[];
  title?: string | null;
  query?: string;
}

const { title = null, query = "" } = defineProps<Props>();

function formerNameFor(team: Team): string | undefined {
  const needle = query.trim().toLocaleLowerCase();

  if (!needle || team.name.toLocaleLowerCase().includes(needle)) return undefined;

  return team.aliases.find((alias) => alias.name.toLocaleLowerCase().includes(needle))?.name;
}
</script>

<template>
  <div v-if="teams.length > 0" class="flex flex-col">
    <h4 v-if="title" class="text-muted text-sm mb-2">
      {{ title }}
    </h4>
    <div class="flex flex-col gap-1">
      <TeamRow
        v-for="team in teams"
        :key="team.id"
        :team="team"
        :former-name="formerNameFor(team)"
      />
    </div>
  </div>
</template>
