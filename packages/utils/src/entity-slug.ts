import slugify from "slugify";

const MAX_SLUG_LENGTH = 120;
const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface MatchSlugInput {
  teamNames: readonly [string | null | undefined, string | null | undefined];
  matchName?: string | null;
  eventSlug: string;
  stageSlug: string;
}

function truncateAtHyphen(slug: string): string {
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  const window = slug.slice(0, MAX_SLUG_LENGTH + 1);
  const cut = window.lastIndexOf("-");
  return cut > 0 ? window.slice(0, cut) : slug.slice(0, MAX_SLUG_LENGTH);
}

export function toSlug(...parts: Array<string | null | undefined>): string {
  const text = parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const slug = slugify(text, { lower: true, strict: true })
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return truncateAtHyphen(slug);
}

export function eventSlug(name: string, year: number | null): string {
  const suffix = year !== null && !YEAR_PATTERN.test(name) ? String(year) : null;
  return toSlug(name, suffix) || "event";
}

export function stageSlug(name: string): string {
  return toSlug(name) || "stage";
}

/** Tournament paths read a UUID segment as a legacy stage id, so a slug must never look like one. */
export async function allocateSlug(
  base: string,
  isTaken: (slug: string) => boolean | Promise<boolean>,
): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    if (!UUID_PATTERN.test(slug) && !(await isTaken(slug))) return slug;
  }
}

function roundLabel(matchName: string | null | undefined): string | null {
  const name = matchName?.trim();
  if (!name) return null;
  const colon = name.indexOf(":");
  if (colon >= 0) return name.slice(0, colon);
  return /tbd/i.test(name) ? null : name;
}

export function matchSlug({ teamNames, matchName, eventSlug, stageSlug }: MatchSlugInput): string {
  const [teamA, teamB] = teamNames.map((name) => {
    const trimmed = name?.trim();
    return trimmed && !/^tbd$/i.test(trimmed) ? trimmed : null;
  });
  const [first, second] =
    teamA && teamB && toSlug(teamA) > toSlug(teamB) ? [teamB, teamA] : [teamA, teamB];
  const lead = first && second ? [first, "vs", second] : [roundLabel(matchName)];
  return toSlug(...lead, eventSlug, stageSlug) || "match";
}

export function forumPostSlug(title: string): string {
  return toSlug(title) || "post";
}
