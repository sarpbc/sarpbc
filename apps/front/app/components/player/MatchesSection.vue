<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";

type PlayerMatchesTab = "upcoming" | "past";

const {
  upcomingMatches,
  pastMatches,
  liveMatches = [],
  pending = false,
  hasError = false,
} = defineProps<{
  upcomingMatches: MatchListItem[];
  pastMatches: MatchListItem[];
  liveMatches?: MatchListItem[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const headingId = "player-matches-title";

const tab = computed<PlayerMatchesTab>(() => {
  const value = route.query.matches;
  return value === "past" ? "past" : "upcoming";
});

const tabItems = computed(() => [
  { value: "upcoming" as const, label: t("page.player.slug.matches.tabs.upcoming") },
  { value: "past" as const, label: t("page.player.slug.matches.tabs.past") },
]);

const activeMatches = computed(() => (tab.value === "past" ? pastMatches : upcomingMatches));

const live = computed(() => (tab.value === "upcoming" ? liveMatches : []));

const hasMatches = computed(() => live.value.length > 0 || activeMatches.value.length > 0);

const listVariant = computed<"upcoming" | "result">(() => {
  switch (tab.value) {
    case "upcoming":
      return "upcoming";
    case "past":
      return "result";
    default: {
      const exhaustive: never = tab.value;
      return exhaustive;
    }
  }
});

const emptyIcon = computed(() => {
  switch (tab.value) {
    case "upcoming":
      return "i-fluent-calendar-clock-24-regular";
    case "past":
      return "i-fluent-checkmark-circle-24-regular";
    default: {
      const exhaustive: never = tab.value;
      return exhaustive;
    }
  }
});

function setTab(nextTab: PlayerMatchesTab) {
  const query = { ...route.query };

  if (nextTab === "upcoming") {
    delete query.matches;
  } else {
    query.matches = nextTab;
  }

  router.replace({ query });
}
</script>

<template>
  <section class="w-full flex flex-col gap-3" :aria-labelledby="headingId">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 :id="headingId" class="text-lg font-semibold tracking-tight pl-1">
        {{ t("page.player.slug.matches.sectionTitle") }}
      </h2>
      <div
        class="flex gap-1"
        role="tablist"
        :aria-label="t('page.player.slug.matches.sectionTitle')"
      >
        <UButton
          v-for="item in tabItems"
          :key="item.value"
          role="tab"
          :aria-selected="tab === item.value"
          variant="soft"
          size="sm"
          :color="tab === item.value ? 'primary' : 'neutral'"
          @click="setTab(item.value)"
        >
          {{ item.label }}
        </UButton>
      </div>
    </div>

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
          {{ t("page.player.slug.matches.error") }}
        </p>
        <UButton variant="outline" color="error" @click="emit('retry')">
          {{ t("page.player.slug.matches.retry") }}
        </UButton>
      </div>
    </UiCard>

    <div v-else-if="hasMatches" class="flex flex-col gap-4">
      <MatchListGroup
        v-if="live.length > 0"
        :matches="live"
        variant="live"
        :title="t('page.player.slug.matches.live')"
      />
      <MatchListGroup
        v-if="activeMatches.length > 0"
        :matches="activeMatches"
        :variant="listVariant"
      />
    </div>

    <UiCard v-else>
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon :name="emptyIcon" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t(`page.player.slug.matches.${tab}.empty`) }}
        </p>
        <p class="text-xs text-dimmed text-pretty">
          {{ t(`page.player.slug.matches.${tab}.emptyHint`) }}
        </p>
      </div>
    </UiCard>
  </section>
</template>
