import { EntityManager } from "@mikro-orm/postgresql";
import { STAFF_CONTRACT_ROLES } from "@sarpbc/types";
import { Circuit } from "../../../circuit/infrastructure/circuit-persistence";
import { Post } from "../../../forum/infrastructure/forum-persistence";
import { WEEKLY_DIGEST_NEWS_TYPE } from "../../../news/domain/news-type";
import { NewsArticle } from "../../../news/infrastructure/news-persistence";
import {
  Contract,
  PLAYER_NATIONALITY_CODE,
  Player,
  Team,
  teamNameAt,
} from "../../../roster/infrastructure/roster-persistence";
import { Season } from "../../../season/infrastructure/season-persistence";
import {
  Match,
  Tournament,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type {
  ForumPostSitemapRow,
  MatchSitemapRow,
  SitemapQueries,
  SlugSitemapRow,
  StageSitemapRow,
  WeeklyDigestSitemapRow,
} from "../../application/ports";

export class SitemapStore implements SitemapQueries {
  constructor(private readonly em: EntityManager) {}

  async news(): Promise<SlugSitemapRow[]> {
    const rows = await this.em.find(
      NewsArticle,
      { isDraft: false },
      { fields: ["slug", "createdAt", "updatedAt"] },
    );

    return rows.map((row) => ({
      lastmod: new Date(row.updatedAt ?? row.createdAt),
      slug: row.slug,
    }));
  }

  async weeklyDigests(): Promise<WeeklyDigestSitemapRow[]> {
    const rows = await this.em.find(
      NewsArticle,
      { isDraft: false, type: WEEKLY_DIGEST_NEWS_TYPE },
      { fields: ["createdAt", "updatedAt"] },
    );

    return rows.map((row) => ({
      createdAt: new Date(row.createdAt),
      lastmod: new Date(row.updatedAt ?? row.createdAt),
    }));
  }

  async stages(): Promise<StageSitemapRow[]> {
    const rows = await this.em.find(
      Tournament,
      {},
      { fields: ["slug", "updatedAt", "event.slug"], populate: ["event"] },
    );

    return rows.map((row) => ({
      eventSlug: row.event.slug,
      lastmod: new Date(row.updatedAt),
      slug: row.slug,
    }));
  }

  async matches(): Promise<MatchSitemapRow[]> {
    const rows = await this.em.find(
      Match,
      {},
      {
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
        populate: ["participants.team", "participants.players", "tournament.event"],
      },
    );

    return rows.map((row) => ({
      lastmod: new Date(row.updatedAt),
      name: row.name,
      participants: row.participants.getItems().map(({ team, players }) => ({
        players: players.getItems().map(({ name }) => ({ name })),
        team: team ? { name: teamNameAt(team, row.beginAt ?? row.tournament.beginAt) } : null,
      })),
      publicId: row.publicId,
      status: row.status,
      tournament: { event: { slug: row.tournament.event.slug }, slug: row.tournament.slug },
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
        $or: [{ team: { $ne: null } }, { contracts: { $some: {} } }, { id: { $in: appeared } }],
        mergedInto: null,
      },
      { fields: ["slug"] },
    );

    return rows.map((row) => row.slug);
  }

  async staffSlugs(): Promise<string[]> {
    const rows = await this.em.find(
      Player,
      { contracts: { $some: { role: { $in: [...STAFF_CONTRACT_ROLES] } } }, mergedInto: null },
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
        $or: [
          { players: { $some: { mergedInto: null } } },
          { id: { $in: appeared } },
          { id: { $in: contracted } },
        ],
        mergedInto: null,
      },
      { fields: ["slug"] },
    );

    return rows.map((row) => row.slug);
  }

  async circuits(): Promise<SlugSitemapRow[]> {
    const rows = await this.em.find(Circuit, {}, { fields: ["slug", "updatedAt"] });

    return rows.map((row) => ({ lastmod: new Date(row.updatedAt), slug: row.slug }));
  }

  async seasons(): Promise<SlugSitemapRow[]> {
    const rows = await this.em.find(
      Season,
      { slug: { $ne: null } },
      { fields: ["slug", "updatedAt"] },
    );

    return rows.flatMap((row) =>
      row.slug === null || row.slug === ""
        ? []
        : [{ lastmod: new Date(row.updatedAt), slug: row.slug }],
    );
  }

  async countryCodes(): Promise<string[]> {
    const rows: { code: string }[] = await this.em
      .getConnection()
      .execute(
        `SELECT DISTINCT ${PLAYER_NATIONALITY_CODE} AS code FROM player WHERE merged_into_id IS NULL AND ${PLAYER_NATIONALITY_CODE} ~ '^[A-Z]{2}$' ORDER BY 1`,
      );

    return rows.map(({ code }) => code);
  }

  async forumPosts(): Promise<ForumPostSitemapRow[]> {
    const rows = await this.em.find(
      Post,
      {},
      { fields: ["publicId", "title", "createdAt", "updatedAt"] },
    );

    return rows.map((row) => ({
      lastmod: new Date(row.updatedAt ?? row.createdAt),
      publicId: row.publicId,
      title: row.title,
    }));
  }
}
