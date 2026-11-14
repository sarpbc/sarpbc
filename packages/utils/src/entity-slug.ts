import slugify from "slugify";
import { isNonEmptyString } from "./text";

const MAX_SLUG_LENGTH = 120;
const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/u;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export interface MatchSlugInput {
  teamNames: readonly [string | null | undefined, string | null | undefined];
  matchName?: string | null;
  eventSlug: string;
  stageSlug: string;
}

const truncateAtHyphen = (slug: string): string => {
  if (slug.length <= MAX_SLUG_LENGTH) {
    return slug;
  }

  const window = slug.slice(0, MAX_SLUG_LENGTH + 1);
  const cut = window.lastIndexOf("-");

  return cut > 0 ? window.slice(0, cut) : slug.slice(0, MAX_SLUG_LENGTH);
};

export const toSlug = (...parts: (string | null | undefined)[]): string => {
  const text = parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  const slug = slugify(text, { lower: true, strict: true })
    .replaceAll(/-{2,}/gu, "-")
    .replaceAll(/^-|-$/gu, "");

  return truncateAtHyphen(slug);
};

export const eventSlug = (name: string, year: number | null): string => {
  const suffix = year !== null && !YEAR_PATTERN.test(name) ? String(year) : null;

  return toSlug(name, suffix) || "event";
};

export const stageSlug = (name: string): string => toSlug(name) || "stage";

/** Tournament paths read a UUID segment as a legacy stage id, so a slug must never look like one. */
export const allocateSlug = async (
  base: string,
  isTaken: (slug: string) => boolean | Promise<boolean>,
): Promise<string> => {
  const allocate = async (attempt: number): Promise<string> => {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;

    if (!UUID_PATTERN.test(slug) && !(await isTaken(slug))) {
      return slug;
    }

    return await allocate(attempt + 1);
  };

  return await allocate(1);
};

const roundLabel = (matchName: string | null | undefined): string | null => {
  const name = matchName?.trim();

  if (!isNonEmptyString(name)) {
    return null;
  }

  const colon = name.indexOf(":");

  if (colon !== -1) {
    return name.slice(0, colon);
  }

  return /tbd/iu.test(name) ? null : name;
};

const knownTeamName = (name: string | null | undefined): string | null => {
  const trimmed = name?.trim();

  return isNonEmptyString(trimmed) && !/^tbd$/iu.test(trimmed) ? trimmed : null;
};

export const isKnownTeamName = (name: string | null | undefined): boolean =>
  knownTeamName(name) !== null;

export const matchSlug = ({
  teamNames,
  matchName,
  eventSlug: event,
  stageSlug: stage,
}: MatchSlugInput): string => {
  const [teamA = null, teamB = null] = teamNames.map(knownTeamName);

  const [first, second] =
    teamA !== null && teamB !== null && toSlug(teamA) > toSlug(teamB)
      ? [teamB, teamA]
      : [teamA, teamB];

  const lead = first !== null && second !== null ? [first, "vs", second] : [roundLabel(matchName)];

  // A manual tournament is the only stage of an event slugged after the same name.
  return toSlug(...lead, event, stage === event ? null : stage) || "match";
};

export const forumPostSlug = (title: string): string => toSlug(title) || "post";
