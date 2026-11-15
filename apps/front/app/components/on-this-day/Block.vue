<script lang="ts" setup>
const { limit = null, standalone = false } = defineProps<{
  limit?: number | null;
  standalone?: boolean;
}>();

const { t, locale } = useI18n();
const localePath = useLocalePath();

const { events, date, pending, error, refresh } = useOnThisDay();

const shown = computed(() => (limit ? events.value.slice(0, limit) : events.value));
const hasMore = computed(() => limit !== null && events.value.length > limit);

const dayLabel = computed(() =>
  date.value
    ? new Intl.DateTimeFormat(locale.value, {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(new Date(date.value))
    : null,
);
</script>

<template>
  <section :aria-labelledby="standalone ? undefined : 'on-this-day-title'">
    <HubRail :caption="standalone ? 'none' : 'section'">
      <template v-if="!standalone" #caption>
        <div class="flex w-full items-end justify-between gap-2 pr-2">
          <h2 id="on-this-day-title">
            {{ t("components.onThisDay.title") }}
            <span v-if="dayLabel" class="font-normal text-muted">· {{ dayLabel }}</span>
          </h2>
          <SLink v-if="hasMore" :to="localePath('/on-this-day')" class="text-xs">
            {{ t("components.onThisDay.viewAll", { count: events.length }) }}
          </SLink>
        </div>
      </template>

      <HubCard v-if="pending && !events.length" aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <HubListItem v-for="index in 3" :key="index" class="gap-3">
          <SSkeleton class="h-3 w-10 shrink-0" />
          <SSkeleton class="h-3 max-w-72 flex-1" />
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t('components.onThisDay.error')" @retry="refresh()" />
      </HubCard>

      <HubCard v-else-if="shown.length > 0">
        <ul>
          <OnThisDayRow
            v-for="(event, index) in shown"
            :key="`${event.kind}-${index}`"
            :event="event"
          />
        </ul>
      </HubCard>

      <HubCard v-else class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-calendar-star-24-regular"
          :title="t('components.onThisDay.empty.title')"
          :hint="t('components.onThisDay.empty.hint')"
        />
      </HubCard>
    </HubRail>
  </section>
</template>
