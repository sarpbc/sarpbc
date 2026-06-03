<script lang="ts" setup>
import type { DrawnBracketMatch } from "~/types/tournament";

const { match } = defineProps<{
  match: DrawnBracketMatch;
}>();
</script>

<template>
  <div class="w-fit h-fit flex flex-row items-center gap-1">
    <div
      v-if="
        (match.previousMatchA && typeof match.previousMatchA !== 'string') ||
        (match.previousMatchB && typeof match.previousMatchB !== 'string')
      "
      class="flex flex-col gap-1"
    >
      <BracketMatch
        v-if="match.previousMatchA && typeof match.previousMatchA !== 'string'"
        :match="match.previousMatchA"
      />
      <BracketMatch
        v-if="match.previousMatchB && typeof match.previousMatchB !== 'string'"
        :match="match.previousMatchB"
      />
    </div>
    <div class="w-64 h-16 flex flex-col items-start justify-center p-2 gap-1 bg-muted/70">
      <div class="w-full grid grid-cols-5">
        <div class="col-span-4 truncate">{{ match.teamA?.name ?? "TBD" }}</div>
        <div class="col-span-1 text-end">0</div>
      </div>
      <div class="w-full grid grid-cols-5">
        <div class="col-span-4 truncate">{{ match.teamB?.name ?? "TBD" }}</div>
        <div class="col-span-1 text-end">0</div>
      </div>
    </div>
  </div>
</template>
