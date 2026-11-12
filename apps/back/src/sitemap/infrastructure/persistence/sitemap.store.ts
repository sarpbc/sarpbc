import { EntityManager } from "@mikro-orm/postgresql";
import { STAFF_CONTRACT_ROLES } from "@sarpbc/types";
import { NewsArticle } from "../../../news/infrastructure/news-persistence";
import {
  Contract,
  Player,
  Team,
  teamNameAt,
} from "../../../roster/infrastructure/roster-persistence";
import {
  Match,
  Tournament,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type {
  MatchSitemapRow,
  NewsSitemapRow,
  SitemapQueries,
  StageSitemapRow,
} from "../../application/ports";

export class SitemapStore implements SitemapQueries {
  constructor(private readonly em: EntityManager) {}

  async news(): Promise<NewsSitemapRow[]> {
    const rows = await this.em.find(
      NewsArticle,
      { isDraft: false },
      { fields: ["slug", "createdAt", "updatedAt"] },
    );
    return rows.map((row) => ({
      slug: row.slug,
      lastmod: new Date(row.updatedAt ?? row.createdAt),
    }));
  }

  async stages(): Promise<StageSitemapRow[]> {
    const rows = await this.em.find(
      Tournament,
      {},
      { populate: ["event"], fields: ["slug", "updatedAt", "event.slug"] },
    );
    return rows.map((row) => ({
      slug: row.slug,
      eventSlug: row.event.slug,
      lastmod: new Date(row.updatedAt),
    }));
  }

  async matches(): Promise<MatchSitemapRow[]> {
    const rows = await this.em.find(
      Match,
      {},
      {
        populate: ["participants.team", "participants.players", "tournament.event"],
        fields: [
          "publicId",
          "name",
          "status",
          "updatedAt",
          "beginAt",
          "participants.team.name",
          "participants.team.aliases",
          "participants.players.name",
          "tournament.slug",
          "tournament.beginAt",
          "tournament.event.slug",
        ],
      },
    );
    return rows.map((row) => ({
      publicId: row.publicId,
      name: row.name,
      status: row.status,
      participants: row.participants.getItems().map(({ team, players }) => ({
        team: team ? { name: teamNameAt(team, row.beginAt ?? row.tournament.beginAt) } : null,
        players: players.getItems().map(({ name }) => ({ name })),
      })),
      tournament: { slug: row.tournament.slug, event: { slug: row.tournament.event.slug } },
      lastmod: new Date(row.updatedAt),
    }));
  }

  async playerSlugs(): Promise<string[]> {
    const appeared = this.em
      .createQueryBuilder(TournamentParticipant, "tp")
      .join("tp.players", "p")
      .select("p.id");
    const rows = await this.em.find(
      Player,
      {
        mergedInto: null,
        $or: [{ team: { $ne: null } }, { contracts: { $some: {} } }, { id: { $in: appeared } }],
      },
      { fields: ["slug"] },
    );
    return rows.map((row) => row.slug);
  }

  async staffSlugs(): Promise<string[]> {
    const rows = await this.em.find(
      Player,
      { mergedInto: null, contracts: { $some: { role: { $in: [...STAFF_CONTRACT_ROLES] } } } },
      { fields: ["slug"] },
    );
    return rows.map((row) => row.slug);
  }

  async teamSlugs(): Promise<string[]> {
    const appeared = this.em.createQueryBuilder(TournamentParticipant, "tp").select("tp.team");
    const contracted = this.em.createQueryBuilder(Contract, "c").select("c.team");
    const rows = await this.em.find(
      Team,
      {
        mergedInto: null,
        $or: [
          { players: { $some: { mergedInto: null } } },
          { id: { $in: appeared } },
          { id: { $in: contracted } },
        ],
      },
      { fields: ["slug"] },
    );
    return rows.map((row) => row.slug);
  }
}
