import type { SitemapEntry, SitemapKind } from "@sarpbc/types";
import {
  isKnownTeamName,
  matchPath,
  newsPath,
  playerPath,
  teamPath,
  tournamentEventPath,
  tournamentStagePath,
} from "@sarpbc/utils";
import { matchPublicSlug } from "../../tournament/domain/competition";
import type { MatchSitemapRow, SitemapQueries, StageSitemapRow } from "./ports";

function dated(path: string, lastmod: Date): SitemapEntry {
  return { path, lastmod: lastmod.toISOString() };
}

function tournamentEntries(stages: StageSitemapRow[]): SitemapEntry[] {
  const eventLastmods = new Map<string, Date>();
  for (const { eventSlug, lastmod } of stages) {
    const latest = eventLastmods.get(eventSlug);
    if (!latest || latest < lastmod) eventLastmods.set(eventSlug, lastmod);
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
    participants.filter(({ team }) => isKnownTeamName(team.name)).length === 2
  );
}

export class SitemapService {
  constructor(private readonly queries: SitemapQueries) {}

  async entries(kind: SitemapKind): Promise<SitemapEntry[]> {
    switch (kind) {
      case "news":
        return (await this.queries.news()).map(({ slug, lastmod }) =>
          dated(newsPath(slug), lastmod),
        );
      case "tournaments":
        return tournamentEntries(await this.queries.stages());
      case "matches":
        return (await this.queries.matches())
          .filter(isListedMatch)
          .map((match) => dated(matchPath(match.publicId, matchPublicSlug(match)), match.lastmod));
      case "players":
        return (await this.queries.playerSlugs()).map((slug) => ({
          path: playerPath(slug),
          lastmod: null,
        }));
      case "teams":
        return (await this.queries.teamSlugs()).map((slug) => ({
          path: teamPath(slug),
          lastmod: null,
        }));
      default: {
        const unhandled: never = kind;
        return unhandled;
      }
    }
  }
}
