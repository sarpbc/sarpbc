import type { SitemapEntry, SitemapKind } from "@sarpbc/types";
import {
  isKnownTeamName,
  participantName,
  matchPath,
  newsPath,
  playerPath,
  staffPath,
  teamPath,
  tournamentEventPath,
  tournamentStagePath,
} from "@sarpbc/utils";
import { matchPublicSlug } from "../../tournament/domain/match";
import type { MatchSitemapRow, SitemapQueries, StageSitemapRow } from "./ports";

function dated(path: string, lastmod: Date): SitemapEntry {
  return { path, lastmod: lastmod.toISOString() };
}

function tournamentEntries(stages: StageSitemapRow[]): SitemapEntry[] {
  const eventLastmods = new Map<string, Date>();

  for (const { eventSlug, lastmod } of stages) {
    const latest = eventLastmods.get(eventSlug);

    if (!latest || latest < lastmod) {
      eventLastmods.set(eventSlug, lastmod);
    }
  }

  return [
    ...[...eventLastmods].map(([slug, lastmod]) => dated(tournamentEventPath(slug), lastmod)),
    ...stages.map(({ eventSlug, slug, lastmod }) =>
      dated(tournamentStagePath(eventSlug, slug), lastmod),
    ),
  ];
}

function isListedMatch({ status, participants }: MatchSitemapRow): boolean {
  return (
    status !== "canceled" &&
    participants.filter((participant) => isKnownTeamName(participantName(participant))).length === 2
  );
}

export class SitemapService {
  constructor(private readonly queries: SitemapQueries) {}

  async entries(kind: SitemapKind): Promise<SitemapEntry[]> {
    switch (kind) {
      case "news": {
        const news = await this.queries.news();

        return news.map(({ slug, lastmod }) => dated(newsPath(slug), lastmod));
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

        return slugs.map((slug) => ({ path: playerPath(slug), lastmod: null }));
      }

      case "staff": {
        const slugs = await this.queries.staffSlugs();

        return slugs.map((slug) => ({ path: staffPath(slug), lastmod: null }));
      }

      case "teams": {
        const slugs = await this.queries.teamSlugs();

        return slugs.map((slug) => ({ path: teamPath(slug), lastmod: null }));
      }

      default: {
        const unhandled: never = kind;

        return unhandled;
      }
    }
  }
}
