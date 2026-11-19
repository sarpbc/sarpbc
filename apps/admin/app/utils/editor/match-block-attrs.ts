import type { MatchBlockSelector } from "@sarpbc/types";
import { newsMatchBlockToAttrs } from "@sarpbc/utils";
import type { NewsMatchBlockAttrs } from "@sarpbc/utils";

export const EMPTY_MATCH_BLOCK_ATTRS: Required<NewsMatchBlockAttrs> = {
  ids: null,
  limit: null,
  match: null,
  team: null,
  tournament: null,
};

export const matchBlockNodeAttrs = (block: MatchBlockSelector) => ({
  ...EMPTY_MATCH_BLOCK_ATTRS,
  ...newsMatchBlockToAttrs(block),
});
