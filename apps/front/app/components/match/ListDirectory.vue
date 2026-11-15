<script lang="ts" setup>
import type { MatchListItem } from "@sarpbc/types";
import type { MatchDiscoverySource } from "~/utils/match-discovery-analytics";

type DirectoryKind = "schedule" | "results";

const {
  kind,
  pending,
  hasError,
  matches,
  liveMatchIds = null,
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
  liveMatchIds?: ReadonlySet<string> | null;
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

const listVariant = computed(() => (kind === "schedule" ? "upcoming" : "result"));

const discoverySource = computed((): MatchDiscoverySource =>
  kind === "schedule" ? "matches_list" : "results_list",
);

const emptyVariant = computed(() => (kind === "schedule" ? "matches" : "results"));
const basePath = computed(() => (kind === "schedule" ? "/matches" : "/results"));
const hasMatches = computed(() => matches.length > 0);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubPageHeader>
      <template #title>{{ t(titleKey) }}</template>
    </HubPageHeader>

    <div>
      <HubCard v-if="pending" class="flex flex-col" aria-live="polite">
        <HubListItem
          v-for="index in 20"
          :key="index"
          size="default"
          :class="kind === 'results' ? 'min-w-0' : undefined"
        >
          <div
            v-if="kind === 'results'"
            class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
          >
            <SSkeleton class="h-3 max-w-32" />
            <SSkeleton class="h-3 w-4 justify-self-end" />
            <SSkeleton class="h-3 max-w-28" />
            <SSkeleton class="h-3 w-4 justify-self-end" />
          </div>
          <div v-else class="grid w-full grid-cols-3 items-center">
            <div class="col-span-2 flex flex-col gap-0.5">
              <SSkeleton class="h-3 w-24" />
              <SSkeleton class="h-3 w-28" />
            </div>
            <div class="col-span-1 flex justify-end">
              <SSkeleton class="h-3 w-10" />
            </div>
          </div>
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="hasError" class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t(errorKey)" @retry="emit('retry')" />
      </HubCard>

      <template v-else-if="hasMatches">
        <MatchListGroup
          :matches="matches"
          :variant="listVariant"
          :live-match-ids="liveMatchIds"
          :discovery-source="discoverySource"
        />

        <HubPagination
          v-if="totalMatches > MATCH_LIST_PAGE_SIZE"
          :current-page="currentPage"
          :total-pages="totalPages"
          :has-previous="hasPrevious"
          :has-next="hasNext"
          :previous-to="{
            path: $localePath(basePath),
            query: getPageQuery(offset - MATCH_LIST_PAGE_SIZE),
          }"
          :next-to="{
            path: $localePath(basePath),
            query: getPageQuery(offset + MATCH_LIST_PAGE_SIZE),
          }"
          class="mt-row"
        />
      </template>

      <MatchListEmpty v-else :variant="emptyVariant" />
    </div>
  </div>
</template>
