<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";

type TeamMatchesVariant = "upcoming" | "past";

const {
  variant,
  matches,
  liveMatches = [],
  pending = false,
  hasError = false,
} = defineProps<{
  variant: TeamMatchesVariant;
  matches: MatchListItem[];
  /** Live matches rendered above the schedule. Ignored on the past variant. */
  liveMatches?: MatchListItem[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useI18n();

const headingId = computed(() => `team-matches-${variant}-title`);

const live = computed(() => (variant === "upcoming" ? liveMatches : []));

const hasMatches = computed(() => live.value.length > 0 || matches.length > 0);

const listVariant = computed<"upcoming" | "result">(() => {
  switch (variant) {
    case "upcoming":
      return "upcoming";
    case "past":
      return "result";
    default: {
      const exhaustive: never = variant;
      return exhaustive;
    }
  }
});

const emptyIcon = computed(() => {
  switch (variant) {
    case "upcoming":
      return "i-fluent-calendar-clock-24-regular";
    case "past":
      return "i-fluent-checkmark-circle-24-regular";
    default: {
      const exhaustive: never = variant;
      return exhaustive;
    }
  }
});
</script>

<template>
  <section class="w-full flex flex-col gap-3" :aria-labelledby="headingId">
    <h2 :id="headingId" class="text-lg font-semibold tracking-tight pl-1">
      {{ t(`page.team.slug.matches.${variant}.title`) }}
    </h2>

    <div v-if="pending" class="flex flex-col gap-2" aria-live="polite">
      <UiCard v-for="index in 3" :key="index">
        <div class="w-full grid grid-cols-3 gap-2 py-2 px-2 items-center">
          <div class="col-span-2 flex flex-col gap-1">
            <USkeleton class="h-3 w-24" />
            <USkeleton class="h-3 w-28" />
          </div>
          <USkeleton class="col-span-1 h-3 w-10 justify-self-end" />
        </div>
      </UiCard>
    </div>

    <UiCard v-else-if="hasError">
      <div class="flex flex-col items-center gap-3 py-8 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.team.slug.matches.error") }}
        </p>
        <UButton variant="outline" color="error" @click="emit('retry')">
          {{ t("page.team.slug.matches.retry") }}
        </UButton>
      </div>
    </UiCard>

    <div v-else-if="hasMatches" class="flex flex-col gap-4">
      <MatchListGroup
        v-if="live.length > 0"
        :matches="live"
        variant="live"
        :title="t('page.team.slug.matches.live')"
      />
      <MatchListGroup v-if="matches.length > 0" :matches="matches" :variant="listVariant" />
    </div>

    <UiCard v-else>
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon :name="emptyIcon" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t(`page.team.slug.matches.${variant}.empty`) }}
        </p>
        <p class="text-xs text-dimmed text-pretty">
          {{ t(`page.team.slug.matches.${variant}.emptyHint`) }}
        </p>
      </div>
    </UiCard>
  </section>
</template>
