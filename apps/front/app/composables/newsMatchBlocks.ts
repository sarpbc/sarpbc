import type { InjectionKey } from "vue";
import type { MatchBlockItem, MatchBlocksResponse } from "@sarpbc/types";
import {
  NEWS_MATCH_BLOCKS_PER_REQUEST,
  extractNewsMatchBlocks,
  newsMatchBlockKey,
} from "@sarpbc/utils";
import type { AsyncDataRequestStatus } from "#app";
import { apiFetch } from "~/utils/apiFetch";

type NewsMatchBlocks = {
  items: Readonly<Ref<Record<string, MatchBlockItem[]>>>;
  status: Readonly<Ref<AsyncDataRequestStatus>>;
};

const NEWS_MATCH_BLOCKS: InjectionKey<NewsMatchBlocks> = Symbol("news-match-blocks");

function chunk<T>(values: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

export function provideNewsMatchBlocks(key: MaybeRefOrGetter<string>, contents: () => string[]) {
  const blockKeys = computed(() => [
    ...new Set(
      contents().flatMap((content) => extractNewsMatchBlocks(content).map(newsMatchBlockKey)),
    ),
  ]);

  const { data, status } = useAsyncData(
    () => toValue(key),
    async (): Promise<Record<string, MatchBlockItem[]>> => {
      const responses = await Promise.all(
        chunk(blockKeys.value, NEWS_MATCH_BLOCKS_PER_REQUEST).map((block) =>
          apiFetch<MatchBlocksResponse>("/matches/blocks", { method: "GET", query: { block } }),
        ),
      );
      return Object.fromEntries(responses.flatMap((response) => Object.entries(response.blocks)));
    },
    { watch: [blockKeys], default: () => ({}) },
  );

  provide(NEWS_MATCH_BLOCKS, { items: data, status });

  useLiveMatchRefresh(key, () =>
    Object.values(data.value).some((items) => items.some((item) => item.state === "live")),
  );
}

export function useNewsMatchBlocks(): NewsMatchBlocks | null {
  return inject(NEWS_MATCH_BLOCKS, null);
}
