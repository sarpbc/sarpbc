import type { SitemapEntry, SitemapKind } from "@sarpbc/types";
import {
  circuitPath,
  countryPath,
  forumPostPath,
  forumPostSlug,
  isKnownTeamName,
  isoWeekIdFromDate,
  participantName,
  matchPath,
  newsPath,
  newsWeekPath,
  playerPath,
  seasonArchivePath,
  staffPath,
  teamPath,
  tournamentEventPath,
  tournamentStagePath,
} from "@sarpbc/utils";
import { matchPublicSlug } from "../../tournament/domain/match";
import type {
  MatchSitemapRow,
  SitemapQueries,
  StageSitemapRow,
  WeeklyDigestSitemapRow,
} from "./ports";

const dated = (path: string, lastmod: Date) =>
  ({
    lastmod: lastmod.toISOString(),
    path,
  }) satisfies SitemapEntry;

const latestByKey = (rows: { key: string; lastmod: Date }[]) => {
  const latest = new Map<string, Date>();

  for (const { key, lastmod } of rows) {
    const current = latest.get(key);

    if (!current || current < lastmod) {
      latest.set(key, lastmod);
    }
  }

  return latest;
};

const weekEntries = (digests: WeeklyDigestSitemapRow[]) =>
  [
    ...latestByKey(
      digests.map(({ createdAt, lastmod }) => ({ key: isoWeekIdFromDate(createdAt), lastmod })),
    ),
  ].map(([week, lastmod]) => dated(newsWeekPath(week), lastmod)) satisfies SitemapEntry[];

const tournamentEntries = (stages: StageSitemapRow[]) => {
  const eventLastmods = latestByKey(
    stages.map(({ eventSlug, lastmod }) => ({ key: eventSlug, lastmod })),
  );

  return [
    ...[...eventLastmods].map(([slug, lastmod]) => dated(tournamentEventPath(slug), lastmod)),
    ...stages.map(({ eventSlug, slug, lastmod }) =>
      dated(tournamentStagePath(eventSlug, slug), lastmod),
    ),
  ] satisfies SitemapEntry[];
};

const isListedMatch = ({ status, participants }: MatchSitemapRow) =>
  status !== "canceled" &&
  participants.filter((participant) => isKnownTeamName(participantName(participant))).length === 2;

export class SitemapService {
  constructor(private readonly queries: SitemapQueries) {}

  async entries(kind: SitemapKind) {
    switch (kind) {
      case "news": {
        const [news, digests] = await Promise.all([
          this.queries.news(),
          this.queries.weeklyDigests(),
        ]);

        return [
          ...news.map(({ slug, lastmod }) => dated(newsPath(slug), lastmod)),
          ...weekEntries(digests),
        ] satisfies SitemapEntry[];
      }

      case "tournaments": {
        return tournamentEntries(await this.queries.stages()) satisfies SitemapEntry[];
      }

      case "matches": {
        const matches = await this.queries.matches();

        return matches
          .filter(isListedMatch)
          .map((match) =>
            dated(matchPath(match.publicId, matchPublicSlug(match)), match.lastmod),
          ) satisfies SitemapEntry[];
      }

      case "players": {
        const slugs = await this.queries.playerSlugs();

        return slugs.map((slug) => ({
          lastmod: null,
          path: playerPath(slug),
        })) satisfies SitemapEntry[];
      }

      case "staff": {
        const slugs = await this.queries.staffSlugs();

        return slugs.map((slug) => ({
          lastmod: null,
          path: staffPath(slug),
        })) satisfies SitemapEntry[];
      }

      case "teams": {
        const slugs = await this.queries.teamSlugs();

        return slugs.map((slug) => ({
          lastmod: null,
          path: teamPath(slug),
        })) satisfies SitemapEntry[];
      }

      case "circuits": {
        const circuits = await this.queries.circuits();

        return circuits.map(({ slug, lastmod }) =>
          dated(circuitPath(slug), lastmod),
        ) satisfies SitemapEntry[];
      }

      case "seasons": {
        const seasons = await this.queries.seasons();

        return seasons.map(({ slug, lastmod }) =>
          dated(seasonArchivePath(slug), lastmod),
        ) satisfies SitemapEntry[];
      }

      case "countries": {
        const codes = await this.queries.countryCodes();

        return codes.map((code) => ({
          lastmod: null,
          path: countryPath(code),
        })) satisfies SitemapEntry[];
      }

      case "forum": {
        const posts = await this.queries.forumPosts();

        return posts.map(({ publicId, title, lastmod }) =>
          dated(forumPostPath(publicId, forumPostSlug(title)), lastmod),
        ) satisfies SitemapEntry[];
      }

      default: {
        const unhandled: never = kind;

        return unhandled satisfies SitemapEntry[];
      }
    }
  }
}
