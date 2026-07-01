<script lang="ts" setup>
const { tab, hasActiveFilters, getTabQuery } = defineProps<{
  tab: MatchesTab;
  hasActiveFilters: boolean;
  getTabQuery: (nextTab: MatchesTab) => Record<string, string>;
}>();

const emit = defineEmits<{
  clear: [];
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const iconName = computed(() => {
  if (hasActiveFilters) return "i-fluent-filter-24-regular";
  return tab === "upcoming" ? "i-fluent-calendar-clock-24-regular" : "i-fluent-trophy-24-regular";
});

const message = computed(() => {
  if (hasActiveFilters) return t("page.matches.filters.filteredEmpty");
  return tab === "upcoming" ? t("page.matches.empty.upcoming") : t("page.matches.empty.past");
});

const hint = computed(() => {
  if (hasActiveFilters) return t("page.matches.filters.filteredEmptyHint");
  return tab === "upcoming"
    ? t("page.matches.empty.upcomingHint")
    : t("page.matches.empty.pastHint");
});
</script>

<template>
  <UiCard class="h-67.75">
    <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
      <UIcon :name="iconName" class="text-4xl text-muted" />
      <p class="text-sm text-muted">
        {{ message }}
      </p>
      <p class="text-xs text-dimmed">
        {{ hint }}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <UButton v-if="hasActiveFilters" color="primary" class="min-h-9" @click="emit('clear')">
          {{ t("page.matches.filters.clear") }}
        </UButton>
        <UButton v-else color="primary" class="min-h-9" :to="localePath('/tournaments')">
          {{ t("page.matches.empty.viewTournaments") }}
        </UButton>
        <UButton
          variant="outline"
          color="neutral"
          class="min-h-9"
          :to="
            hasActiveFilters
              ? localePath('/tournaments')
              : {
                  path: localePath('/matches'),
                  query: getTabQuery(tab === 'upcoming' ? 'past' : 'upcoming'),
                }
          "
        >
          {{
            hasActiveFilters
              ? t("page.matches.empty.viewTournaments")
              : tab === "upcoming"
                ? t("page.matches.empty.viewPast")
                : t("page.matches.empty.viewUpcoming")
          }}
        </UButton>
      </div>
    </div>
  </UiCard>
</template>
