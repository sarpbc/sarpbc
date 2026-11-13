<script lang="ts" setup>
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const { date } = useOnThisDay();

const dayLabel = computed(() =>
  date.value
    ? new Intl.DateTimeFormat(locale.value, {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(date.value))
    : null,
);

setPageSeo({
  title: t("page.onThisDay.seoTitle"),
  description: t("page.onThisDay.description"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ t("page.onThisDay.title") }}</template>
      <template v-if="dayLabel" #meta>
        <span>{{ dayLabel }}</span>
      </template>
    </SHubPageHeader>

    <OnThisDayBlock standalone />

    <p class="px-2 text-xs text-muted">{{ t("page.onThisDay.note") }}</p>
  </div>
</template>
