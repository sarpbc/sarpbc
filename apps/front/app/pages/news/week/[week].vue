<script setup lang="ts">
import { isoWeekIdFromDate, isoWeekUtcRange, parseIsoWeekId } from "@sarpbc/utils";
import { NEWS_PROSE_CLASS } from "~/utils/newsProseClass";

const { locale, t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const route = useRoute();

const weekId = computed(() => route.params.week as string);

if (!parseIsoWeekId(weekId.value)) {
  throw createError({
    statusCode: 404,
    message: t("page.news.articleNotFound"),
  });
}

const { data: week } = await useAsyncData(
  () => `news-week-${weekId.value}-${locale.value}`,
  () => getNewsWeek(weekId.value, locale.value),
  { watch: [weekId, locale] },
);

if (!week.value || week.value.items.length === 0) {
  throw createError({
    statusCode: 404,
    message: t("page.news.articleNotFound"),
  });
}

const currentWeekId = isoWeekIdFromDate(new Date());
const isCurrentWeek = computed(() => weekId.value === currentWeekId);
const range = computed(() => isoWeekUtcRange(weekId.value));

const rangeLabel = computed(() => {
  const bounds = range.value;
  if (!bounds) {
    return "";
  }
  const endInclusive = new Date(bounds.end.getTime() - 1);
  const format = new Intl.DateTimeFormat(locale.value, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return t("page.news.week.range", {
    start: format.format(bounds.start),
    end: format.format(endInclusive),
  });
});

const title = computed(() => (isCurrentWeek.value ? t("page.news.week.title") : rangeLabel.value));

setPageSeo({
  title: t("page.news.week.seoTitle"),
  description: t("page.news.week.seoDescription"),
});
</script>

<template>
  <div v-if="week" class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ title }}</template>
      <template #meta>
        <span>{{ t("page.home.shortNewsCount", week.items.length) }}</span>
        <span v-if="isCurrentWeek && rangeLabel" class="text-muted">{{ rangeLabel }}</span>
      </template>
    </SHubPageHeader>

    <SCard class="w-full overflow-hidden">
      <article
        v-for="item in week.items"
        :id="item.slug"
        :key="item.id"
        class="scroll-mt-header border-b border-default px-4 py-5 last:border-b-0"
      >
        <div class="flex w-full flex-col gap-3">
          <div class="flex w-full min-w-0 flex-col gap-1">
            <p class="text-xs text-muted tabular-nums">
              {{ formatLocaleTimeAgo(new Date(item.createdAt)) }}
            </p>
            <h2 class="text-lg font-semibold tracking-tight text-highlighted text-balance">
              <a :href="`#${item.slug}`" class="hover:text-primary">
                {{ item.title }}
              </a>
            </h2>
            <p v-if="item.author" class="text-xs text-muted">{{ item.author }}</p>
          </div>
          <MDC :value="item.content" :class="NEWS_PROSE_CLASS" />
        </div>
      </article>
    </SCard>
  </div>
</template>
