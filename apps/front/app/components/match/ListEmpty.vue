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
  <SCard class="flex min-h-row-stack h-row-grid items-center">
    <SEmptyState :icon="iconName" :title="message" :hint="hint">
      <SbButton :to="localePath('/tournaments')">
        {{ t("page.matches.empty.viewTournaments") }}
      </SbButton>
      <SbButton variant="secondary" :to="secondaryTo">
        {{ secondaryLabel }}
      </SbButton>
    </SEmptyState>
  </SCard>
</template>
