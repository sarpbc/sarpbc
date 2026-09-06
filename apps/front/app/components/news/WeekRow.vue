<script lang="ts" setup>
import type { NewsWeek } from "~/composables/news";

const localePath = useLocalePath();
const { t } = useI18n();

const props = defineProps<{
  week: NewsWeek;
}>();

const latest = computed(() => props.week.items[0] ?? null);
</script>

<template>
  <SListItem
    v-if="latest"
    size="default"
    divider
    :to="localePath(`/news/week/${props.week.week}`)"
    class="min-w-0 overflow-hidden"
  >
    <div class="flex w-full min-w-0 items-center justify-between gap-x-3">
      <h2 class="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-default">
        {{ t("page.home.latestShort", { title: latest.title }) }}
      </h2>
      <p class="shrink-0 text-xs font-thin text-muted tabular-nums">
        {{ formatLocaleTimeAgo(new Date(latest.createdAt)) }}
      </p>
    </div>
  </SListItem>
</template>
