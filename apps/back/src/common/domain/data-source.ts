import type { DataSource } from "@sarpbc/types";
import { isAcceptedDataSourceUrl } from "@sarpbc/utils";
import { InvalidInputError } from "./errors/invalid-input-error";

export const REFUSED_DATA_SOURCE_MESSAGE =
  "A source must be an http(s) URL of the official rules or announcement; Liquipedia and BLAST.tv are refused";

export const parseDataSourceUrl = (value: string | null): string | null => {
  const url = value?.trim() ?? "";

  if (!url) {
    return null;
  }

  if (!isAcceptedDataSourceUrl(url)) {
    throw new InvalidInputError(REFUSED_DATA_SOURCE_MESSAGE);
  }

  return url;
};

/**
 * start.gg terms allow display with credit. Its players and teams are public; its tournaments
 * and matches stay out of the MCP, open-data exports and other redistribution paths.
 */
export const isRedistributable = (source: DataSource): boolean => {
  switch (source) {
    case "pandascore":
    case "manual": {
      return true;
    }

    case "startgg": {
      return false;
    }

    default: {
      const exhaustive: never = source;

      return exhaustive;
    }
  }
};

export const sourceFromUrl = (url: string): Exclude<DataSource, "pandascore"> => {
  const host = new URL(url).hostname.toLowerCase();

  return host === "start.gg" || host.endsWith(".start.gg") ? "startgg" : "manual";
};
