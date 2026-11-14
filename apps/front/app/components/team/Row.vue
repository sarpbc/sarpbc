<script lang="ts" setup>
import type { Team } from "@sarpbc/types";
import { teamPath } from "@sarpbc/utils";

interface Props {
  team: Team;
  formerName?: string | null;
}

const { team, formerName = null } = defineProps<Props>();
</script>

<template>
  <UButton
    class="flex items-center gap-3"
    variant="ghost"
    color="neutral"
    :to="$localePath(teamPath(team.slug))"
  >
    <div class="flex-1 min-w-0">
      <div class="flex flex-col">
        <span class="text-highlighted font-medium truncate">
          {{ team.name }}
        </span>
        <span v-if="formerName" class="text-xs text-muted truncate">
          {{ $t("general.formerly", { name: formerName }) }}
        </span>
      </div>
    </div>
  </UButton>
</template>
