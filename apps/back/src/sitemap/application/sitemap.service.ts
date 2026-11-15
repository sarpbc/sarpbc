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

const dated = (path: string, lastmod: Date): SitemapEntry => ({
  lastmod: lastmod.toISOString(),
  path,
});

const latestByKey = (rows: { key: string; lastmod: Date }[]): Map<string, Date> => {
  const latest = new Map<string, Date>();

  for (const { key, lastmod } of rows) {
    const current = latest.get(key);

    if (!current || current < lastmod) {
      latest.set(key, lastmod);
    }
  }

  return latest;
};

const weekEntries = (digests: WeeklyDigestSitemapRow[]): SitemapEntry[] =>
  [
    ...latestByKey(
      digests.map(({ createdAt, lastmod }) => ({ key: isoWeekIdFromDate(createdAt), lastmod })),
    ),
  ].map(([week, lastmod]) => dated(newsWeekPath(week), lastmod));

const tournamentEntries = (stages: StageSitemapRow[]): SitemapEntry[] => {
  const eventLastmods = latestByKey(
    stages.map(({ eventSlug, lastmod }) => ({ key: eventSlug, lastmod })),
  );

  return [
    ...[...eventLastmods].map(([slug, lastmod]) => dated(tournamentEventPath(slug), lastmod)),
    ...stages.map(({ eventSlug, slug, lastmod }) =>
      dated(tournamentStagePath(eventSlug, slug), lastmod),
    ),
  ];
};

const isListedMatch = ({ status, participants }: MatchSitemapRow): boolean =>
  status !== "canceled" &&
  participants.filter((participant) => isKnownTeamName(participantName(participant))).length === 2;

export class SitemapService {
  constructor(private readonly queries: SitemapQueries) {}

  async entries(kind: SitemapKind): Promise<SitemapEntry[]> {
    switch (kind) {
      case "news": {
        const [news, digests] = await Promise.all([
          this.queries.news(),
          this.queries.weeklyDigests(),
        ]);

        return [
          ...news.map(({ slug, lastmod }) => dated(newsPath(slug), lastmod)),
          ...weekEntries(digests),
        ];
      }

      case "tournaments": {
        return tournamentEntries(await this.queries.stages());
      }

      case "matches": {
        const matches = await this.queries.matches();

        return matches
          .filter(isListedMatch)
          .map((match) => dated(matchPath(match.publicId, matchPublicSlug(match)), match.lastmod));
      }

      case "players": {
        const slugs = await this.queries.playerSlugs();

        return slugs.map((slug) => ({ lastmod: null, path: playerPath(slug) }));
      }

      case "staff": {
        const slugs = await this.queries.staffSlugs();

        return slugs.map((slug) => ({ lastmod: null, path: staffPath(slug) }));
      }

      case "teams": {
        const slugs = await this.queries.teamSlugs();

        return slugs.map((slug) => ({ lastmod: null, path: teamPath(slug) }));
      }

      case "circuits": {
        const circuits = await this.queries.circuits();

        return circuits.map(({ slug, lastmod }) => dated(circuitPath(slug), lastmod));
      }

      case "seasons": {
        const seasons = await this.queries.seasons();

        return seasons.map(({ slug, lastmod }) => dated(seasonArchivePath(slug), lastmod));
      }

      case "countries": {
        const codes = await this.queries.countryCodes();

        return codes.map((code) => ({ lastmod: null, path: countryPath(code) }));
      }

      case "forum": {
        const posts = await this.queries.forumPosts();

        return posts.map(({ publicId, title, lastmod }) =>
          dated(forumPostPath(publicId, forumPostSlug(title)), lastmod),
        );
      }

      default: {
        const unhandled: never = kind;

        return unhandled;
      }
    }
  }
}
