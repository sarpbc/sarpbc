import type { TimelineEntryInput } from "@sarpbc/types";
import {
  TIMELINE_MIN_YEAR,
  TIMELINE_NAME_MAX_LENGTH,
  TIMELINE_NOTE_MAX_LENGTH,
  parseIsoDay,
} from "@sarpbc/utils";
import { parseDataSourceUrl } from "../../common/domain/data-source";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

const requiredText = (value: string, label: string, maxLength: number) => {
  const text = value.trim();

  if (!text || text.length > maxLength) {
    throw new InvalidInputError(`The ${label} has between 1 and ${maxLength} characters.`);
  }

  return text;
};

const parseDate = (value: string) => {
  const date = value.trim();
  const day = parseIsoDay(date);

  if (!day) {
    throw new InvalidInputError("The date is not a calendar date (YYYY-MM-DD).");
  }

  if (day.year < TIMELINE_MIN_YEAR) {
    throw new InvalidInputError(`The date is not before ${TIMELINE_MIN_YEAR}.`);
  }

  return date;
};

const parseSource = (value: string) => {
  const url = parseDataSourceUrl(value);

  if (url === null) {
    throw new InvalidInputError("The official source is required.");
  }

  return url;
};

export const parseTimelineEntry = (input: TimelineEntryInput) =>
  ({
    date: parseDate(input.date),
    kind: input.kind,
    nameEn: requiredText(input.nameEn, "English name", TIMELINE_NAME_MAX_LENGTH),
    nameFr: requiredText(input.nameFr, "French name", TIMELINE_NAME_MAX_LENGTH),
    noteEn: requiredText(input.noteEn, "English note", TIMELINE_NOTE_MAX_LENGTH),
    noteFr: requiredText(input.noteFr, "French note", TIMELINE_NOTE_MAX_LENGTH),
    sourceUrl: parseSource(input.sourceUrl),
  }) satisfies TimelineEntryInput;
