<script setup lang="ts">
import type { Match } from "~/types/matches";

const { locale } = useI18n();

const { match } = defineProps<{ match: Match }>();

const timeFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { timeStyle: "short" }));
const dateFormatter = computed(() => mediumDateFormatter(locale.value));
</script>

<template>
  <div class="flex flex-col items-center gap-1 text-center text-sm text-muted text-pretty">
    <template v-if="match.beginAt">
      <p class="text-3xl font-medium text-highlighted tabular-nums">
        {{ timeFormatter.format(new Date(match.beginAt)) }}
      </p>
      <p class="tabular-nums">{{ dateFormatter.format(new Date(match.beginAt)) }}</p>
    </template>
  </div>
</template>
