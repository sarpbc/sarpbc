import slugify from "slugify";

const MAX_SLUG_LENGTH = 120;
const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/;

export interface TournamentSlugInput {
  leagueName?: string | null;
  serie?: string | null;
  stageName?: string | null;
  beginAt?: Date | null;
}

export interface MatchSlugInput {
  teamNames: readonly [string | null | undefined, string | null | undefined];
  matchName?: string | null;
  tournament: TournamentSlugInput;
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

export function tournamentSlugParts(input: TournamentSlugInput): string[] {
  const parts = [input.leagueName, input.serie, input.stageName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (input.beginAt && !parts.some((part) => YEAR_PATTERN.test(part))) {
    parts.push(String(input.beginAt.getUTCFullYear()));
  }
  return parts;
}

function roundLabel(matchName: string | null | undefined): string | null {
  const name = matchName?.trim();
  if (!name) return null;
  const colon = name.indexOf(":");
  if (colon >= 0) return name.slice(0, colon);
  return /tbd/i.test(name) ? null : name;
}

export function matchSlug({ teamNames, matchName, tournament }: MatchSlugInput): string {
  const [teamA, teamB] = teamNames.map((name) => {
    const trimmed = name?.trim();
    return trimmed && !/^tbd$/i.test(trimmed) ? trimmed : null;
  });
  const [first, second] =
    teamA && teamB && toSlug(teamA) > toSlug(teamB) ? [teamB, teamA] : [teamA, teamB];
  const lead = first && second ? [first, "vs", second] : [roundLabel(matchName)];
  return toSlug(...lead, ...tournamentSlugParts(tournament)) || "match";
}

export function forumPostSlug(title: string): string {
  return toSlug(title) || "post";
}

export function matchPath(publicId: number, slug: string): string {
  return `/matches/${publicId}/${slug}`;
}

export function forumPostPath(publicId: number, slug: string): string {
  return `/forum/post/${publicId}/${slug}`;
}
