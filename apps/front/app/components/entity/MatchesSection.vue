<script lang="ts" setup>
import type { MatchListItem } from "@sarpbc/types";
import type { EntityKind } from "~/types/entity";

const {
  kind,
  upcomingMatches,
  pastMatches,
  liveMatches = [],
  pending = false,
  hasError = false,
} = defineProps<{
  kind: EntityKind;
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
const { tab, emptyIcon, setTab } = useEntityListTab("matches");

const headingId = computed(() => `${kind}-matches-title`);

const tabItems = computed(() => [
  { value: "upcoming" as const, label: t(`page.${kind}.slug.matches.tabs.upcoming`) },
  { value: "past" as const, label: t(`page.${kind}.slug.matches.tabs.past`) },
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
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <div class="flex w-full items-end justify-between gap-2">
          <h2 :id="headingId">
            {{ t(`page.${kind}.slug.matches.sectionTitle`) }}
          </h2>
          <STabs
            :model-value="tab"
            :items="tabItems"
            :ariaLabel="t(`page.${kind}.slug.matches.sectionTitle`)"
            @update:model-value="setTab"
          />
        </div>
      </template>

      <div v-if="pending" class="flex flex-col gap-2" aria-live="polite">
        <SCard v-for="index in 3" :key="index">
          <div class="w-full grid grid-cols-3 gap-2 py-2 px-2 items-center">
            <div class="col-span-2 flex flex-col gap-1">
              <USkeleton class="h-3 w-24" />
              <USkeleton class="h-3 w-28" />
            </div>
            <USkeleton class="col-span-1 h-3 w-10 justify-self-end" />
          </div>
        </SCard>
      </div>

      <SCard v-else-if="hasError">
        <SErrorState :message="t(`page.${kind}.slug.matches.error`)" @retry="emit('retry')" />
      </SCard>

      <div v-else-if="hasMatches" class="flex flex-col gap-4">
        <MatchListGroup v-if="live.length > 0" :matches="live" variant="live" />
        <MatchListGroup
          v-if="activeMatches.length > 0"
          :matches="activeMatches"
          :variant="listVariant"
        />
      </div>

      <SCard v-else>
        <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
          <UIcon :name="emptyIcon" class="text-3xl text-muted" />
          <p class="text-sm text-muted text-pretty">
            {{ t(`page.${kind}.slug.matches.${tab}.empty`) }}
          </p>
          <p class="text-xs text-muted text-pretty">
            {{ t(`page.${kind}.slug.matches.${tab}.emptyHint`) }}
          </p>
        </div>
      </SCard>
    </SRail>
  </section>
</template>
