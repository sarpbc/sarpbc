import type { MatchBlockSelector } from "@sarpbc/types";
import { newsMatchBlockToAttrs } from "@sarpbc/utils";
import type { NewsMatchBlockAttrs } from "@sarpbc/utils";

export const EMPTY_MATCH_BLOCK_ATTRS: Required<NewsMatchBlockAttrs> = {
  match: null,
  ids: null,
  tournament: null,
  team: null,
  limit: null,
};

export function matchBlockNodeAttrs(block: MatchBlockSelector): Required<NewsMatchBlockAttrs> {
  return { ...EMPTY_MATCH_BLOCK_ATTRS, ...newsMatchBlockToAttrs(block) };
}
