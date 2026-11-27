<script lang="ts" setup>
import { newsWeekPath } from "@sarpbc/utils";
import type { NewsArticleListItem } from "~/types/news";

const localePath = useLocalePath();
const { t } = useI18n();

const { week, latest } = defineProps<{
  week: string;
  latest: NewsArticleListItem;
}>();
</script>

<template>
  <HubListItem :to="localePath(newsWeekPath(week))" class="min-w-0 gap-x-4 overflow-hidden">
    <h2
      class="min-w-0 flex-1 line-clamp-2 text-row leading-5 text-default group-hover:text-highlighted"
    >
      {{ t("page.home.latestShort", { title: latest.title }) }}
    </h2>
    <p class="shrink-0 text-xs font-normal text-muted tabular-nums">
      {{ formatLocaleTimeAgo(new Date(latest.createdAt)) }}
    </p>
  </HubListItem>
</template>
