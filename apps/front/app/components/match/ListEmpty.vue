<script lang="ts" setup>
type EmptyVariant = "matches" | "results";

const { variant } = defineProps<{
  variant: EmptyVariant;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const iconName = computed(() =>
  variant === "matches" ? "i-fluent-calendar-clock-24-regular" : "i-fluent-trophy-24-regular",
);

const message = computed(() =>
  variant === "matches" ? t("page.matches.empty.upcoming") : t("page.results.empty.title"),
);

const hint = computed(() =>
  variant === "matches" ? t("page.matches.empty.upcomingHint") : t("page.results.empty.hint"),
);

const secondaryTo = computed(() =>
  variant === "matches" ? localePath("/results") : localePath("/matches"),
);

const secondaryLabel = computed(() =>
  variant === "matches" ? t("page.matches.empty.viewResults") : t("page.results.empty.viewMatches"),
);
</script>

<template>
  <SCard class="min-h-row-stack">
    <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
      <UIcon :name="iconName" class="text-4xl text-muted" />
      <p class="text-sm text-muted">
        {{ message }}
      </p>
      <p class="text-xs text-dimmed">
        {{ hint }}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <UButton color="primary" class="min-h-9" :to="localePath('/tournaments')">
          {{ t("page.matches.empty.viewTournaments") }}
        </UButton>
        <UButton variant="outline" color="neutral" class="min-h-9" :to="secondaryTo">
          {{ secondaryLabel }}
        </UButton>
      </div>
    </div>
  </SCard>
</template>
