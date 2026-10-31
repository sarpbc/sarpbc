import type { InjectionKey } from "vue";
import type { MatchBlockItem, MatchBlocksResponse } from "@sarpbc/types";
import { extractNewsMatchBlocks, newsMatchBlockKey } from "@sarpbc/utils";
import type { AsyncDataRequestStatus } from "#app";
import { apiFetch } from "~/utils/apiFetch";

type NewsMatchBlocks = {
  items: Readonly<Ref<Record<string, MatchBlockItem[]>>>;
  status: Readonly<Ref<AsyncDataRequestStatus>>;
};

const NEWS_MATCH_BLOCKS: InjectionKey<NewsMatchBlocks> = Symbol("news-match-blocks");

export function provideNewsMatchBlocks(key: MaybeRefOrGetter<string>, contents: () => string[]) {
  const blockKeys = computed(() => [
    ...new Set(
      contents().flatMap((content) => extractNewsMatchBlocks(content).map(newsMatchBlockKey)),
    ),
  ]);

  const { data, status } = useAsyncData(
    () => toValue(key),
    async (): Promise<Record<string, MatchBlockItem[]>> => {
      if (blockKeys.value.length === 0) {
        return {};
      }
      const response = await apiFetch<MatchBlocksResponse>("/matches/blocks", {
        method: "GET",
        query: { block: blockKeys.value },
      });
      return response.blocks;
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
