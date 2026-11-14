import type { Viewership } from "@sarpbc/types";
import { parseViewership, VIEWERSHIP_SOURCE_NAME_MAX_LENGTH } from "@sarpbc/utils";
import type { ViewershipError } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

export type ViewershipOwnerKind = "event" | "match";

export interface ViewershipOwner {
  kind: ViewershipOwnerKind;
  id: string;
}

const ERRORS = {
  "average-above-peak": "Average viewers cannot exceed peak viewers.",
  "forbidden-source": "Liquipedia, BLAST.tv and start.gg are not accepted viewership sources.",
  "invalid-average": "Average viewers must be a whole number of viewers.",
  "invalid-measured-at": "The measurement date is not a valid date.",
  "invalid-peak": "Peak viewers must be a whole number of viewers.",
  "invalid-source-url": "The viewership source URL is not a valid URL.",
  "missing-source-name": "Viewership needs the name of its source to credit.",
  "source-name-too-long": `The source name is over ${VIEWERSHIP_SOURCE_NAME_MAX_LENGTH} characters.`,
  "source-url-not-https": "The viewership source URL must use https.",
} satisfies Record<ViewershipError, string>;

export const requireViewership = (input: Viewership): Viewership => {
  const parsed = parseViewership(input);

  if (!parsed.ok) {
    throw new InvalidInputError(ERRORS[parsed.error]);
  }

  return parsed.viewership;
};
