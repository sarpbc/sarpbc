import type { Viewership } from "@sarpbc/types";
import {
  parseViewership,
  VIEWERSHIP_SOURCE_NAME_MAX_LENGTH,
  type ViewershipError,
} from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";

export type ViewershipOwnerKind = "event" | "match";

export interface ViewershipOwner {
  kind: ViewershipOwnerKind;
  id: string;
}

const ERRORS = {
  "invalid-peak": "Peak viewers must be a whole number of viewers.",
  "invalid-average": "Average viewers must be a whole number of viewers.",
  "average-above-peak": "Average viewers cannot exceed peak viewers.",
  "missing-source-name": "Viewership needs the name of its source to credit.",
  "source-name-too-long": `The source name is over ${VIEWERSHIP_SOURCE_NAME_MAX_LENGTH} characters.`,
  "invalid-source-url": "The viewership source URL is not a valid URL.",
  "source-url-not-https": "The viewership source URL must use https.",
  "forbidden-source": "Liquipedia and BLAST.tv are not accepted viewership sources.",
  "invalid-measured-at": "The measurement date is not a valid date.",
} satisfies Record<ViewershipError, string>;

export function requireViewership(input: Viewership): Viewership {
  const parsed = parseViewership(input);
  if (!parsed.ok) throw new InvalidInputError(ERRORS[parsed.error]);
  return parsed.viewership;
}
