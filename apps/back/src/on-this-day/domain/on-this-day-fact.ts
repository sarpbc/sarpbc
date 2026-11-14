import type { OnThisDayFactLinkInput } from "@sarpbc/types";
import {
  ON_THIS_DAY_MIN_YEAR,
  ON_THIS_DAY_SOURCE_URL_MAX_LENGTH,
  ON_THIS_DAY_TEXT_MAX_LENGTH,
  isForbiddenSourceHost,
  isMonthDay,
} from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

export interface OnThisDayFactFields {
  month: number;
  day: number;
  year: number | null;
  textEn: string;
  textFr: string;
  link: OnThisDayFactLinkInput | null;
  sourceUrl: string | null;
}

function requiredText(value: string, language: string): string {
  const text = value.trim();

  if (!text || text.length > ON_THIS_DAY_TEXT_MAX_LENGTH) {
    throw new InvalidInputError(
      `The ${language} text has between 1 and ${ON_THIS_DAY_TEXT_MAX_LENGTH} characters.`,
    );
  }

  return text;
}

function parseYear(year: number | null, month: number, day: number): number | null {
  if (year === null) {
    return null;
  }

  if (!Number.isInteger(year) || year < ON_THIS_DAY_MIN_YEAR || year > 9999) {
    throw new InvalidInputError(`The year is a whole number from ${ON_THIS_DAY_MIN_YEAR}.`);
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCMonth() !== month - 1) {
    throw new InvalidInputError(`February 29 does not exist in ${year}.`);
  }

  return year;
}

export function parseFactSourceUrl(value: string | null): string | null {
  const raw = value?.trim() ?? "";

  if (!raw) {
    return null;
  }

  if (raw.length > ON_THIS_DAY_SOURCE_URL_MAX_LENGTH) {
    throw new InvalidInputError(
      `The source has at most ${ON_THIS_DAY_SOURCE_URL_MAX_LENGTH} characters.`,
    );
  }

  if (!URL.canParse(raw)) {
    throw new InvalidInputError("The source must be an http(s) URL.");
  }

  const url = new URL(raw);

  if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
    throw new InvalidInputError("The source must be an http(s) URL.");
  }

  if (isForbiddenSourceHost(url.hostname)) {
    throw new InvalidInputError(
      "Liquipedia and BLAST.tv are not accepted sources; cite the official announcement.",
    );
  }

  return url.href;
}

export function parseOnThisDayFact(input: OnThisDayFactFields): OnThisDayFactFields {
  if (!isMonthDay(input.month, input.day)) {
    throw new InvalidInputError("The month and day do not form a calendar date.");
  }

  return {
    month: input.month,
    day: input.day,
    year: parseYear(input.year, input.month, input.day),
    textEn: requiredText(input.textEn, "English"),
    textFr: requiredText(input.textFr, "French"),
    link: input.link,
    sourceUrl: parseFactSourceUrl(input.sourceUrl),
  };
}

export function isFactShownOn(
  fact: Pick<OnThisDayFactFields, "month" | "day" | "year">,
  on: { year: number; month: number; day: number },
): boolean {
  return (
    fact.month === on.month && fact.day === on.day && (fact.year === null || fact.year <= on.year)
  );
}
