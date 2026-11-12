import type { UiLocale } from "./locale";

export function matchPath(publicId: number, slug: string): string {
  return `/matches/${publicId}/${slug}`;
}

export function forumPostPath(publicId: number, slug: string): string {
  return `/forum/post/${publicId}/${slug}`;
}

export function staffPath(slug: string): string {
  return `/staff/${slug}`;
}

export function playerPath(slug: string): string {
  return `/player/${slug}`;
}

export function teamPath(slug: string): string {
  return `/team/${slug}`;
}

export function newsPath(slug: string): string {
  return `/news/${slug}`;
}

export function tournamentEventPath(eventSlug: string): string {
  return `/tournaments/${eventSlug}`;
}

export function tournamentStagePath(eventSlug: string, stageSlug: string): string {
  return `/tournaments/${eventSlug}/${stageSlug}`;
}

export function stageMatchesPath(eventSlug: string, stageSlug: string): string {
  return `${tournamentStagePath(eventSlug, stageSlug)}/matches`;
}

export function circuitPath(slug: string): string {
  return `/circuits/${slug}`;
}

export function localizedPath(path: string, locale: UiLocale): string {
  return locale === "fr" ? `/fr${path}` : path;
}
