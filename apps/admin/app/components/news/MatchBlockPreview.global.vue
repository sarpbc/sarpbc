<script setup lang="ts">
import type { MatchBlockItem, MatchBlockState, MatchBlocksResponse } from "@sarpbc/types";
import { newsMatchBlockFromAttrs, newsMatchBlockKey } from "@sarpbc/utils";

const props = defineProps<{
  match?: string | null;
  ids?: string | null;
  tournament?: string | null;
  team?: string | null;
  limit?: string | number | null;
}>();

const { t, locale } = useI18n();

const blockKey = computed(() => {
  const block = newsMatchBlockFromAttrs(props);
  return block ? newsMatchBlockKey(block) : null;
});

const { data, status } = useLazyAsyncData(
  () => `match-block-preview-${blockKey.value ?? "invalid"}`,
  async (): Promise<MatchBlockItem[] | null> => {
    if (!blockKey.value) {
      return null;
    }
    const response = await apiFetch<MatchBlocksResponse>("/matches/blocks", {
      method: "GET",
      query: { block: blockKey.value },
    });
    return response.blocks[blockKey.value] ?? [];
  },
  { server: false },
);

const dateFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }),
);

function teamName(item: MatchBlockItem, index: number): string {
  return item.participants[index]?.team.name || t("newsTag.matchTbd");
}

function score(item: MatchBlockItem, index: number): string {
  const participant = item.participants[index];
  const result = item.results.find((entry) => entry.participant === participant?.id);
  return result ? String(result.score) : "–";
}

function stateColor(state: MatchBlockState): "error" | "info" | "neutral" {
  switch (state) {
    case "live":
      return "error";
    case "upcoming":
      return "info";
    case "finished":
      return "neutral";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function stateLabel(item: MatchBlockItem): string {
  switch (item.state) {
    case "live":
      return t("newsTag.matchLive");
    case "finished":
      return t("newsTag.matchFinal");
    case "upcoming":
      return item.beginAt
        ? dateFormatter.value.format(new Date(item.beginAt))
        : t("newsTag.matchTbd");
    default: {
      const exhaustive: never = item.state;
      return exhaustive;
    }
  }
}
</script>

<template>
  <div class="not-prose my-4 flex w-full min-w-0 flex-col border border-default bg-default">
    <div
      v-if="status === 'pending' || status === 'idle'"
      class="flex flex-col gap-2 p-3"
      aria-busy="true"
    >
      <USkeleton class="h-4 w-2/3" />
      <USkeleton class="h-4 w-1/2" />
    </div>

    <p v-else-if="!blockKey" class="p-3 text-sm text-error">
      {{ t("newsTag.matchesInvalid") }}
    </p>

    <p v-else-if="status === 'error' || !data" class="p-3 text-sm text-muted">
      {{ t("newsTag.matchesUnavailable") }}
    </p>

    <p v-else-if="data.length === 0" class="p-3 text-sm text-muted">
      {{ t("newsTag.matchesEmpty") }}
    </p>

    <template v-else>
      <ul class="flex flex-col divide-y divide-default">
        <li
          v-for="item in data"
          :key="item.id"
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2 text-sm"
        >
          <span class="truncate font-medium text-highlighted" translate="no">
            {{ teamName(item, 0) }}
            <span class="tabular-nums text-muted">{{ score(item, 0) }} – {{ score(item, 1) }}</span>
            {{ teamName(item, 1) }}
          </span>
          <UBadge
            :color="stateColor(item.state)"
            variant="subtle"
            size="sm"
            :label="stateLabel(item)"
          />
          <span class="col-span-2 truncate text-xs text-muted" translate="no">
            {{ item.tournament.event.name }} · {{ item.tournament.name }}
          </span>
        </li>
      </ul>
      <p
        v-if="data.some((item) => item.startgg)"
        class="border-t border-default px-3 py-2 text-xs text-muted"
      >
        {{ t("newsTag.matchDataBy") }} start.gg
      </p>
    </template>
  </div>
</template>
