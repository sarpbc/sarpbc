import type { SeasonAwardType } from "@sarpbc/types";
import {
  SEASON_AWARD_PRESENTER_MAX_LENGTH,
  SEASON_AWARD_REGION_MAX_LENGTH,
  SEASON_AWARD_SOURCE_URL_MAX_LENGTH,
  isForbiddenSourceHost,
} from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

export interface SeasonAwardFields {
  awardType: SeasonAwardType;
  region: string | null;
  presentedBy: string | null;
  sourceUrl: string;
}

export const SEASON_AWARD_LABELS = {
  regional_mvp: "Regional MVP",
  regular_season_mvp: "Regular Season MVP",
  season_mvp: "Season MVP",
} as const satisfies Record<SeasonAwardType, string>;

const regionRule = (awardType: SeasonAwardType) => {
  switch (awardType) {
    case "season_mvp": {
      return "forbidden";
    }

    case "regular_season_mvp": {
      return "optional";
    }

    case "regional_mvp": {
      return "required";
    }

    default: {
      const exhaustive: never = awardType;

      return exhaustive;
    }
  }
};

const optionalText = (value: string | null | undefined, max: number, field: string) => {
  const trimmed = value?.trim() ?? "";

  if (trimmed.length > max) {
    throw new InvalidInputError(`The ${field} has at most ${max} characters.`);
  }

  return trimmed || null;
};

const parseRegion = (awardType: SeasonAwardType, value: string | null | undefined) => {
  const region = optionalText(value, SEASON_AWARD_REGION_MAX_LENGTH, "region");
  const rule = regionRule(awardType);
  const label = SEASON_AWARD_LABELS[awardType];

  if (rule === "required" && region === null) {
    throw new InvalidInputError(`A ${label} names its region.`);
  }

  if (rule === "forbidden" && region !== null) {
    throw new InvalidInputError(`A ${label} covers the whole season and has no region.`);
  }

  return region;
};

const assertAwardSourceUrl = (value: string) => {
  if (value.length > SEASON_AWARD_SOURCE_URL_MAX_LENGTH) {
    throw new InvalidInputError(
      `The award source has at most ${SEASON_AWARD_SOURCE_URL_MAX_LENGTH} characters.`,
    );
  }

  if (!URL.canParse(value) || !/^https?:$/u.test(new URL(value).protocol)) {
    throw new InvalidInputError("The award source must be an http(s) URL.");
  }

  if (isForbiddenSourceHost(new URL(value).hostname)) {
    throw new InvalidInputError(
      "Liquipedia and BLAST.tv are not accepted sources; cite the official announcement.",
    );
  }
};

export const parseSeasonAward = (input: {
  awardType: SeasonAwardType;
  region?: string | null;
  presentedBy?: string | null;
  sourceUrl: string;
}) => {
  const sourceUrl = input.sourceUrl.trim();
  assertAwardSourceUrl(sourceUrl);

  return {
    awardType: input.awardType,
    presentedBy: optionalText(input.presentedBy, SEASON_AWARD_PRESENTER_MAX_LENGTH, "presenter"),
    region: parseRegion(input.awardType, input.region),
    sourceUrl,
  };
};
