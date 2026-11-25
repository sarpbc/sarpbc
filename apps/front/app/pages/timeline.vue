<script lang="ts" setup>
import type { TimelineEntry } from "@sarpbc/types";
import { uiLocale } from "@sarpbc/utils";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const {
  data: entries,
  pending,
  error,
  refresh,
} = await useAsyncData("timeline", () => getTimeline(), { default: () => [] });

const isFrench = computed(() => uiLocale(locale.value) === "fr");

const dayFormatter = computed(() => mediumCalendarDayFormatter(locale.value));

const day = (entry: TimelineEntry) => dayFormatter.value.format(new Date(entry.date));

const nameOf = (entry: TimelineEntry) => (isFrench.value ? entry.nameFr : entry.nameEn);

const noteOf = (entry: TimelineEntry) => (isFrench.value ? entry.noteFr : entry.noteEn);

const years = computed(() => {
  const byYear = Map.groupBy(entries.value, (entry) => entry.date.slice(0, 4));

  return [...byYear]
    .map(([year, group]) => ({ entries: group.toReversed(), year }))
    .toSorted((a, b) => b.year.localeCompare(a.year));
});

setPageSeo({
  description: t("page.timeline.description"),
  title: t("page.timeline.seoTitle"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubPageHeader>
      <template #title>{{ t("page.timeline.title") }}</template>
    </HubPageHeader>

    <HubCard v-if="pending && entries.length === 0" aria-live="polite">
      <span class="sr-only">{{ t("common.loading") }}</span>
      <HubListItem v-for="index in 6" :key="index" class="gap-3">
        <SSkeleton class="h-3 w-20 shrink-0" />
        <SSkeleton class="h-3 max-w-72 flex-1" />
      </HubListItem>
    </HubCard>

    <HubCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.timeline.error')" @retry="refresh()" />
    </HubCard>

    <HubCard v-else-if="entries.length === 0">
      <HubListItem class="text-sm text-muted">{{ t("page.timeline.empty") }}</HubListItem>
    </HubCard>

    <template v-else>
      <section v-for="group in years" :key="group.year" :aria-labelledby="`timeline-${group.year}`">
        <HubRail>
          <template #caption>
            <h2 :id="`timeline-${group.year}`">{{ group.year }}</h2>
          </template>

          <HubCard>
            <ol>
              <li
                v-for="entry in group.entries"
                :key="`${entry.date}-${entry.kind}-${entry.nameEn}`"
                class="row-separator flex min-w-0 flex-col gap-1 px-2 py-2.5"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <time
                    :datetime="entry.date"
                    class="w-24 shrink-0 text-xs text-muted tabular-nums"
                  >
                    {{ day(entry) }}
                  </time>
                  <SBadge :color="entry.kind === 'patch' ? 'info' : 'warning'" class="shrink-0">
                    {{ t(`page.timeline.kinds.${entry.kind}`) }}
                  </SBadge>
                  <span class="min-w-0 flex-1 text-row text-default">
                    {{ nameOf(entry) }}
                  </span>
                  <SLink
                    :to="entry.sourceUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="shrink-0 text-xs"
                  >
                    {{ t("page.timeline.source") }}
                  </SLink>
                </div>
                <p class="text-sm text-muted">{{ noteOf(entry) }}</p>
              </li>
            </ol>
          </HubCard>
        </HubRail>
      </section>
    </template>
  </div>
</template>
