import type { UiLocale } from "./locale";

export const matchPath = (publicId: number, slug: string): string => `/matches/${publicId}/${slug}`;

export const forumPostPath = (publicId: number, slug: string): string =>
  `/forum/post/${publicId}/${slug}`;

export const staffPath = (slug: string): string => `/staff/${slug}`;

export const playerPath = (slug: string): string => `/player/${slug}`;

export const teamPath = (slug: string): string => `/team/${slug}`;

export const newsPath = (slug: string): string => `/news/${slug}`;

export const tournamentEventPath = (eventSlug: string): string => `/tournaments/${eventSlug}`;

export const tournamentStagePath = (eventSlug: string, stageSlug: string): string =>
  `/tournaments/${eventSlug}/${stageSlug}`;

export const stageMatchesPath = (eventSlug: string, stageSlug: string): string =>
  `${tournamentStagePath(eventSlug, stageSlug)}/matches`;

export const stageStatsPath = (eventSlug: string, stageSlug: string): string =>
  `${tournamentStagePath(eventSlug, stageSlug)}/stats`;

export const circuitPath = (slug: string): string => `/circuits/${slug}`;

export const seasonArchivePath = (slug: string): string => `/seasons/${slug}`;

export const countryPath = (code: string): string => `/countries/${code.toLowerCase()}`;

export const localizedPath = (path: string, locale: UiLocale): string =>
  locale === "fr" ? `/fr${path}` : path;
