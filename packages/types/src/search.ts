export const SEARCH_TYPES = ["player", "team", "tournament", "all"] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];
