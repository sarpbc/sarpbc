<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";
import type { MatchDiscoverySource } from "~/utils/matchDiscoveryAnalytics";

type DirectoryKind = "schedule" | "results";

const {
  kind,
  pending,
  hasError,
  matches,
  liveMatchIds,
  totalMatches,
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
  getPageQuery,
  offset,
} = defineProps<{
  kind: DirectoryKind;
  pending: boolean;
  hasError: boolean;
  matches: MatchListItem[];
  liveMatchIds?: ReadonlySet<string>;
  totalMatches: number;
  currentPage: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  getPageQuery: (nextOffset: number) => OffsetPageQuery;
  offset: number;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useI18n();

const titleKey = computed(() =>
  kind === "schedule" ? "page.matches.title" : "page.results.title",
);
const errorKey = computed(() =>
  kind === "schedule" ? "page.matches.error" : "page.results.error",
);
const retryKey = computed(() =>
  kind === "schedule" ? "page.matches.retry" : "page.results.retry",
);
const listVariant = computed(() => (kind === "schedule" ? "upcoming" : "result"));
const discoverySource = computed(
  (): MatchDiscoverySource => (kind === "schedule" ? "matches_list" : "results_list"),
);
const emptyVariant = computed(() => (kind === "schedule" ? "matches" : "results"));
const basePath = computed(() => (kind === "schedule" ? "/matches" : "/results"));
const hasMatches = computed(() => matches.length > 0);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ t(titleKey) }}</template>
    </SHubPageHeader>

    <div>
      <SCard v-if="pending" flush-bottom class="flex flex-col" aria-live="polite">
        <SListItem
          v-for="index in 20"
          :key="index"
          size="default"
          divider
          :class="kind === 'results' ? 'min-w-0' : undefined"
        >
          <div
            v-if="kind === 'results'"
            class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
          >
            <USkeleton class="h-3 max-w-32" />
            <USkeleton class="h-3 w-4 justify-self-end" />
            <USkeleton class="h-3 max-w-28" />
            <USkeleton class="h-3 w-4 justify-self-end" />
          </div>
          <div v-else class="grid w-full grid-cols-3 items-center">
            <div class="col-span-2 flex flex-col gap-0.5">
              <USkeleton class="h-3 w-24" />
              <USkeleton class="h-3 w-28" />
            </div>
            <div class="col-span-1 flex justify-end">
              <USkeleton class="h-3 w-10" />
            </div>
          </div>
        </SListItem>
      </SCard>

      <SCard v-else-if="hasError">
        <div class="flex min-h-row-stack flex-col items-center justify-center gap-3">
          <UIcon name="i-fluent-warning-24-regular" class="text-4xl text-muted" />
          <p class="text-sm text-muted">
            {{ t(errorKey) }}
          </p>
          <UButton variant="outline" color="error" @click="emit('retry')">
            {{ t(retryKey) }}
          </UButton>
        </div>
      </SCard>

      <template v-else-if="hasMatches">
        <MatchListGroup
          :matches="matches"
          :variant="listVariant"
          :live-match-ids="liveMatchIds"
          :discovery-source="discoverySource"
        />

        <MatchListPagination
          v-if="totalMatches > MATCH_LIST_PAGE_SIZE"
          :base-path="basePath"
          :current-page="currentPage"
          :total-pages="totalPages"
          :has-previous="hasPrevious"
          :has-next="hasNext"
          :get-page-query="getPageQuery"
          :offset="offset"
          :page-size="MATCH_LIST_PAGE_SIZE"
          class="mt-row"
        />
      </template>

      <MatchListEmpty v-else :variant="emptyVariant" />
    </div>
  </div>
</template>
