import { isMatchFinished, isMatchLive } from "@sarpbc/utils";

export type MatchDiscoverySource =
  | "matches_list"
  | "results_list"
  | "home_strip"
  | "lateral_bar"
  | "tournament_hub"
  | "news_article";

export type MatchDiscoveryStatus = "live" | "upcoming" | "finished";

export const listVariantToDiscoveryStatus = (variant: "live" | "upcoming" | "result") => {
  switch (variant) {
    case "live": {
      return "live";
    }

    case "upcoming": {
      return "upcoming";
    }

    case "result": {
      return "finished";
    }

    default: {
      const _exhaustive: never = variant;

      return _exhaustive;
    }
  }
};

export const resolveMatchDiscoveryStatus = (input: {
  endAt?: Date | string | null;
  beginAt?: Date | string | null;
  status?: string | null;
  now?: number;
}) => {
  if (isMatchFinished(input)) {
    return "finished";
  }

  return isMatchLive(input, input.now ?? Date.now()) ? "live" : "upcoming";
};
