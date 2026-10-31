import {
  newsMatchBlockToAttrs,
  type NewsMatchBlock,
  type NewsMatchBlockAttrs,
} from "@sarpbc/utils";

export const EMPTY_MATCH_BLOCK_ATTRS: Required<NewsMatchBlockAttrs> = {
  match: null,
  ids: null,
  tournament: null,
  team: null,
  limit: null,
};

export function matchBlockNodeAttrs(block: NewsMatchBlock): Required<NewsMatchBlockAttrs> {
  return { ...EMPTY_MATCH_BLOCK_ATTRS, ...newsMatchBlockToAttrs(block) };
}
