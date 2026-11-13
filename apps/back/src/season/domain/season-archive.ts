import type { SeasonFormat, SeasonPathEntryInput } from "@sarpbc/types";
import {
  MAX_SEASON_FORMAT_PHASES,
  SEASON_FORMAT_PHASE_DESCRIPTION_MAX_LENGTH,
  SEASON_FORMAT_PHASE_NAME_MAX_LENGTH,
  SEASON_FORMAT_SUMMARY_MAX_LENGTH,
  SEASON_PATH_LABEL_MAX_LENGTH,
  SEASON_PATH_NOTE_MAX_LENGTH,
  SEASON_PATH_RESULT_MAX_LENGTH,
  toSlug,
} from "@sarpbc/utils";
import { isUuid } from "../../common/domain/entity-ref";
import { InvalidInputError } from "../../common/domain/errors";

export interface SeasonPathEntryFields {
  label: string;
  result: string;
  tournamentId: string | null;
}

export const EMPTY_SEASON_FORMAT: SeasonFormat = { summary: null, phases: [] };

function optionalText(value: string | null | undefined, max: number, field: string) {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length > max)
    throw new InvalidInputError(`The ${field} has at most ${max} characters.`);
  return trimmed || null;
}

function requiredText(value: string, max: number, field: string) {
  const text = optionalText(value, max, field);
  if (text === null) throw new InvalidInputError(`The ${field} is required.`);
  return text;
}

export function parseSeasonSlug(raw: string | null): string | null {
  if (raw === null || !raw.trim()) return null;
  const slug = toSlug(raw);
  if (!slug || isUuid(slug))
    throw new InvalidInputError(
      "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs-2024).",
    );
  return slug;
}

export function parseSeasonFormat(format: SeasonFormat): SeasonFormat {
  if (format.phases.length > MAX_SEASON_FORMAT_PHASES)
    throw new InvalidInputError(`A season format has at most ${MAX_SEASON_FORMAT_PHASES} phases.`);
  return {
    summary: optionalText(format.summary, SEASON_FORMAT_SUMMARY_MAX_LENGTH, "format summary"),
    phases: format.phases.map((phase) => ({
      name: requiredText(phase.name, SEASON_FORMAT_PHASE_NAME_MAX_LENGTH, "phase name"),
      description: optionalText(
        phase.description,
        SEASON_FORMAT_PHASE_DESCRIPTION_MAX_LENGTH,
        "phase description",
      ),
    })),
  };
}

export function parsePathNote(value: string | null | undefined): string | null {
  return optionalText(value, SEASON_PATH_NOTE_MAX_LENGTH, "path note");
}

export function parsePathEntry(input: SeasonPathEntryInput): SeasonPathEntryFields {
  return {
    label: requiredText(input.label, SEASON_PATH_LABEL_MAX_LENGTH, "path entry label"),
    result: requiredText(input.result, SEASON_PATH_RESULT_MAX_LENGTH, "path entry result"),
    tournamentId: input.tournamentId ?? null,
  };
}
