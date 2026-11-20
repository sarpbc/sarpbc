import { isAcceptedDataSourceUrl } from "@sarpbc/utils";
import { InvalidInputError } from "./errors/invalid-input-error";

export const REFUSED_DATA_SOURCE_MESSAGE =
  "A source must be an http(s) URL of the official rules or announcement; Liquipedia, BLAST.tv and start.gg are refused";

export const parseDataSourceUrl = (value: string | null) => {
  const url = value?.trim() ?? "";

  if (!url) {
    return null;
  }

  if (!isAcceptedDataSourceUrl(url)) {
    throw new InvalidInputError(REFUSED_DATA_SOURCE_MESSAGE);
  }

  return url;
};
