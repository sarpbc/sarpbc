import type { UiLocale } from "./locale";

export const matchPath = (publicId: number, slug: string) => `/matches/${publicId}/${slug}`;

export const forumPostPath = (publicId: number, slug: string) => `/forum/post/${publicId}/${slug}`;

export const staffPath = (slug: string) => `/staff/${slug}`;

export const playerPath = (slug: string) => `/player/${slug}`;

export const teamPath = (slug: string) => `/team/${slug}`;

export const newsPath = (slug: string) => `/news/${slug}`;

export const newsWeekPath = (weekId: string) => `/news/week/${weekId}`;

export const tournamentEventPath = (eventSlug: string) => `/tournaments/${eventSlug}`;

export const tournamentStagePath = (eventSlug: string, stageSlug: string) =>
  `/tournaments/${eventSlug}/${stageSlug}`;

export const stageMatchesPath = (eventSlug: string, stageSlug: string) =>
  `${tournamentStagePath(eventSlug, stageSlug)}/matches`;

export const stageStatsPath = (eventSlug: string, stageSlug: string) =>
  `${tournamentStagePath(eventSlug, stageSlug)}/stats`;

export const circuitPath = (slug: string) => `/circuits/${slug}`;

export const seasonArchivePath = (slug: string) => `/seasons/${slug}`;

export const countryPath = (code: string) => `/countries/${code.toLowerCase()}`;

export const localizedPath = (path: string, locale: UiLocale) =>
  locale === "fr" ? `/fr${path}` : path;
